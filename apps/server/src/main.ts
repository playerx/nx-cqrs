import { PusherServerEvent } from '@nx-cqrs/pusher/api'
import { ServerCommand } from '@nx-cqrs/server/api'
import {
  Queue,
  RabbitMQQueue,
  subscribeCommands,
  subscribeEvents,
} from '@nx-cqrs/shared'
import { Server as HttpServer } from 'http'

async function run() {
  const httpServer = new HttpServer()

  // create connection to the queue
  const queue: Queue = new RabbitMQQueue({
    amqpConnectionString: '',
    moduleName: 'Main',
    publishExchangeName: 'HubExchange',
    newId: () => Date.now().toString(),
  })

  // Subscribe Pusher events
  subscribeEvents<PusherServerEvent>(
    queue,
    ['Server.Pusher.'],
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

  // Subscribe Main Server commands
  subscribeCommands<ServerCommand>(
    queue,
    ['Server.Main.'],
    async e => {
      switch (e.type) {
      }
    },
  )

  httpServer.listen(process.env.PORT || 7000)
}

run()
