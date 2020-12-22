import { PusherServerCommand } from '@nx-cqrs/pusher/api'
import {
  createPublisher,
  Queue,
  RabbitMQQueue,
  subscribeAllMessages,
  subscribeCommands,
} from '@nx-cqrs/shared'
import { Server as HttpServer } from 'http'
import { pusherStart } from './app/pusher.start'
import { restServerStart } from './app/restServer.start'
import { environment } from './environments/environment'

async function run() {
  const app = restServerStart()
  const httpServer = new HttpServer(app)

  // Create connection to the queue
  const queue: Queue = new RabbitMQQueue({
    amqpConnectionString: '',
    moduleName: 'Pusher',
    publishExchangeName: 'HubExchange',
    newId: () => Date.now().toString(),
  })

  // Redirect messages to the clients via socket.io
  subscribeAllMessages(queue, ['Client.'], async (e, m) => {
    const socketId = m.socketId
    if (!socketId) {
      return
    }

    const socket = io.to(socketId)
    if (!socket) {
      return
    }

    socket.send(e)
  })

  // Handle pusher commands
  subscribeCommands<PusherServerCommand<any>>(
    queue,
    ['Server.Pusher.'],
    async e => {
      switch (e.type) {
        case 'Server.Pusher.SendToSocket':
          {
            const { socketId, message } = e

            io.of('/').to(socketId).send(message)
          }
          break

        case 'Server.Pusher.SendToEveryone':
          {
            const { message } = e

            io.send(message)
          }
          break

        case 'Server.Pusher.JoinChannels':
          {
            const { socketId, channels } = e

            io.of('/').sockets.get(socketId)?.join(channels)
          }
          break

        case 'Server.Pusher.LeaveChannels':
          {
            const { socketId, channels } = e

            const socket = io.of('/').sockets.get(socketId)
            if (socket) {
              channels.forEach(channel => socket.leave(channel))
            }
          }
          break

        case 'Server.Pusher.SendToChannel':
          {
            const { channel, message } = e

            io.to(channel).send(message)
          }
          break
      }
    },
  )

  const publisher = createPublisher(queue)

  // Start socket.io server
  const io = pusherStart({
    httpServer,
    tokenIssuer: environment.tokenIssuer,
    tokenSecret: environment.tokenSecret,
    publishMessage: (type, message, metadata) =>
      publisher.publishMessage(type, message, metadata),

    origins: environment.origins
      ? environment.origins.split(',')
      : undefined,

    redisConfig: {
      host: environment.redisHost,
    },
  })

  httpServer.listen(process.env.PORT || 7001)
}

run()
