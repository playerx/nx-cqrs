import { PusherServerEvent } from '@nx-cqrs/pusher/api'
import { getUserByJwtToken, MessageMetadata } from '@nx-cqrs/shared'
import { Server } from 'http'
import { RedisClient } from 'redis'
import * as socketIO from 'socket.io'
import { createAdapter } from 'socket.io-redis'

interface Props {
  tokenIssuer: string
  tokenSecret: string
  httpServer: Server
  origins?: string | string[] | '*'
  publishMessage: (
    message: any,
    metadata: MessageMetadata,
  ) => Promise<void>
  redisConfig?: {
    host: string
    port?: number
  }
}

export function pusherStart(props: Props) {
  const {
    httpServer,
    tokenIssuer,
    tokenSecret,
    redisConfig,
    origins,
    publishMessage,
  } = props

  const io = new socketIO.Server(httpServer, {
    transports: ['polling', 'websocket'],
    cors: {
      origin: origins,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    cookie: {
      httpOnly: false,
    },
  })

  const userSockets = new Map<string, number>()

  let incUserSocket = async (userId: string): Promise<number> => {
    const value = userSockets.has(userId)
      ? userSockets.get(userId) + 1
      : 1

    userSockets.set(userId, value)
    return value
  }

  let decUserSocket = async (userId: string): Promise<number> => {
    if (!userSockets.has(userId)) {
      return 0
    }

    const value = userSockets.get(userId) - 1
    if (value <= 0) {
      userSockets.delete(userId)
      return 0
    }

    return value
  }

  if (redisConfig) {
    const { host, port } = redisConfig

    const pubClient = new RedisClient({ host, port })
    const subClient = pubClient.duplicate()

    io.adapter(createAdapter({ pubClient, subClient }))

    const prefix = 'USER_SOCKETS_'

    incUserSocket = userId =>
      new Promise((resolve, reject) =>
        pubClient.incr(prefix + userId, (err, result) => {
          if (err) {
            reject(err)
            return
          }

          resolve(result)
        }),
      )

    incUserSocket = userId =>
      new Promise((resolve, reject) =>
        pubClient.decr(prefix + userId, (err, result) => {
          if (err) {
            reject(err)
            return
          }

          if (!result) {
            pubClient.del(prefix + userId)
          }

          resolve(result)
        }),
      )

    subClient.subscribe()
  }

  io.on(
    'connection',
    (socket: socketIO.Socket & { data: UserData }) => {
      const authTimer = setTimeout(() => disconnect(socket), 1000)

      socket.on('authentication', async data => {
        clearTimeout(authTimer)

        if (!data) {
          disconnect(socket)
          return
        }

        const { appId, accessToken } = data

        if (!appId) {
          disconnect(socket)
          return
        }

        const userData = authenticate({
          accessToken,
          tokenIssuer,
          tokenSecret,
        })

        if (!userData) {
          disconnect(socket)
          return
        }

        const { userId, userRoles = [] } = userData

        socket.join([appId, userId, ...userRoles])

        const getMetadata = () =>
          <MessageMetadata>{
            ...socket.data.config,
            fromAppId: appId,
            socketId: socket.id,
            userId: socket.data.userId,
            userRoles: socket.data.userRoles,
          }

        socket.data = {
          appId,
          userId,
          userRoles,
          config: {},
        }

        socket.send({
          type: 'Client.Pusher.Authenticated',
          userId,
        })

        const userActiveSocketsCount = await incUserSocket(
          userId + appId,
        )

        publishMessage(
          <PusherServerEvent>{
            type: 'Server.Pusher.Socket.Connected',
            socketId: socket.id,
            userId: socket.data.userId,
            userActiveSocketsCount,
          },
          getMetadata(),
        )

        socket.on('config', config => {
          socket.data.config = {
            ...socket.data.config,
            ...config,
          }
        })

        socket.on('message', message => {
          publishMessage(message, getMetadata())
        })

        socket.on('disconnect', async () => {
          const userActiveSocketsCount = await decUserSocket(
            userId + appId,
          )

          publishMessage(
            <PusherServerEvent>{
              type: 'Server.Pusher.Socket.Disconnected',
              socketId: socket.id,
              userId: socket.data.userId,
              userActiveSocketsCount,
            },
            getMetadata(),
          )
        })
      })
    },
  )

  return io
}

function authenticate(props: {
  tokenIssuer: string
  tokenSecret: string
  accessToken: string
}) {
  try {
    const { tokenIssuer, tokenSecret, accessToken } = props

    if (!accessToken) {
      return null
    }

    const userData = getUserByJwtToken(accessToken, {
      tokenIssuer,
      tokenSecret,
    })
    if (!userData) {
      return null
    }

    if (userData.tokenError) {
      return null
    }

    return {
      userId: userData.viewerId,
      userRoles: userData.viewerRoles,
    }
  } catch (err) {
    return null
  }
}

function disconnect(socket: socketIO.Socket) {
  socket.send('NEED_AUTHENTICATION')
  socket.disconnect(true)
}

interface UserData {
  appId: string
  userId: string
  userRoles: string[]
  config: { [key: string]: string }
}
