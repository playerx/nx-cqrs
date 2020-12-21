import { PusherServerCommand } from '@nx-cqrs/pusher/api'
import {
  Message,
  MessageBus,
  Queue,
  RabbitMQQueue,
} from '@nx-cqrs/shared'
import { Server as HttpServer } from 'http'
import { pusherStart } from './app/pusher.start'
import { restServerStart } from './app/restServer.start'
import { environment } from './environments/environment'

/**
 * Listen to the messages which starts with:
 *  `Client.`           - forward them to the socket
 *  `Server.Pusher.`    - process
 */
const listenRoutePatterns = [
  // forward them to the socket
  'Client.',

  // process
  'Server.Pusher.',
]

async function run() {
  const app = restServerStart()
  const httpServer = new HttpServer(app)

  // create connection to the queue
  const queue: Queue = new RabbitMQQueue({
    amqpConnectionString: '',
    listenRoutePatterns,
    name: 'Pusher',
    publishExchangeName: 'HubExchange',
    newId: () => Date.now().toString(),
  })

  // create bus which will ack messages after processing
  const bus = new MessageBus<PusherServerCommand<any>>(queue, {
    listenRoutePatterns,
  })

  // start socket.io server
  const io = pusherStart({
    httpServer,
    tokenIssuer: environment.tokenIssuer,
    tokenSecret: environment.tokenSecret,
    publishMessage: (message, metadata) =>
      bus.publish(message, metadata),

    origins: environment.origins
      ? environment.origins.split(',')
      : undefined,

    redisConfig: {
      host: environment.redisHost,
    },
  })

  // start listening bus and process messages
  bus.subscribe(async (x, m) => {
    switch (x.type) {
      case 'Pusher.SendToSocket':
        {
          const { socketId, message } = x

          io.of('/').to(socketId).send(message)
        }
        break

      case 'Pusher.SendToEveryone':
        {
          const { message } = x

          io.send(message)
        }
        break

      case 'Server.Pusher.JoinChannels':
        {
          const { socketId, channels } = x

          io.of('/').sockets.get(socketId)?.join(channels)
        }
        break

      case 'Server.Pusher.LeaveChannels':
        {
          const { socketId, channels } = x

          const socket = io.of('/').sockets.get(socketId)
          if (socket) {
            channels.forEach(channel => socket.leave(channel))
          }
        }
        break

      case 'Server.Pusher.SendToChannel':
        {
          const { channel, message } = x

          io.to(channel).send(message)
        }
        break

      default:
        {
          const clientMessage = x as Message<{ type: string }>
          if (clientMessage.type?.startsWith('Client.')) {
            const socketId = m.socketId
            if (socketId) {
              io.to(socketId).send(x)
            }
          }
        }
        break
    }
  })

  httpServer.listen(process.env.PORT || 7001)
}

run()
