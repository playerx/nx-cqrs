import {
  JokerClientMessage,
  JokerServerMessage,
} from '@nx-cqrs/joker/api'
import { PusherServerEvent } from '@nx-cqrs/pusher/api'
import {
  createPublisher,
  Queue,
  RabbitMQQueue,
  subscribeCommands,
  subscribeEvents,
} from '@nx-cqrs/shared'
import { Server as HttpServer } from 'http'

async function run() {
  const httpServer = new HttpServer()

  // Create connection to the queue
  const queue: Queue = new RabbitMQQueue({
    amqpConnectionString: '',
    moduleName: 'Joker',
    publishExchangeName: 'HubExchange',
    newId: () => Date.now().toString(),
  })

  // Subscribe Pusher events
  subscribeEvents<PusherServerEvent>(
    {
      queue,
      patterns: ['Server.Pusher.'],
      guards: [],
    },
    async e => {
      switch (e.type) {
        case 'Server.Pusher.Socket.Connected':
          {
            console.log('Main Server', 'socket connected', e)
          }
          break

        case 'Server.Pusher.Socket.Disconnected':
          {
            console.log('Main Server', 'socket disconnected', e)
          }
          break
      }
    },
  )

  // Process Joker commands
  subscribeCommands<JokerServerMessage>(
    {
      queue,
      patterns: ['Server.Joker.'],
      guards: [],
    },
    async x => {},
  )

  // Create publisher
  const publisher = createPublisher<JokerClientMessage>(queue)

  publisher.publishCommand

  httpServer.listen(process.env.PORT || 7000)
}

run()
