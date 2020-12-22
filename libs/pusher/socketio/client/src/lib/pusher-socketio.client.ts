import {
  PusherClient,
  PusherClientMessage,
} from '@nx-cqrs/pusher/api'
import { Subject } from 'rxjs'
import { Manager, Socket } from 'socket.io-client'

export class PusherSocketIOClient<TInMessage, TOutMessage>
  implements PusherClient<TInMessage, TOutMessage> {
  pusher$ = new Subject<PusherClientMessage>()
  message$ = new Subject<TInMessage>()

  private manager: Manager
  private socket: Socket

  constructor(options: {
    appId: string
    url: string
    getQueryParams: () => Object
    handleError: (err: Error, msg: any) => void
  }) {
    this.manager = new Manager(options.url, {
      autoConnect: false, // important to be 'true' for namespaces to work properly
      reconnection: true,
      reconnectionAttempts: 0,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      rejectUnauthorized: false,
      forceNew: false,
      query: options.getQueryParams(),
    })

    const socket = this.manager.socket(options.appId)

    socket.on('connect', (...args: any) => {
      this.pusher$.next({
        type: 'Client.Pusher.Connected',
      })
    })

    socket.on('reconnect', () => {
      this.pusher$.next({
        type: 'Client.Pusher.Connected',
      })
    })

    socket.on('connect_error', (err: Error) => {
      this.pusher$.next({
        type: 'Client.Pusher.Error',
        reasonCode: 'CONNECT_ERROR',
        error: err,
      })
    })

    // socket.on('reconnect_error', (err: Error) => {
    //   data$.next({
    //     type: 'ERROR',
    //     detail: { type: 'RECONNECT_ERROR', error: err },
    //   })
    // })

    socket.on('connect_timeout', () => {
      this.pusher$.next({
        type: 'Client.Pusher.Error',
        reasonCode: 'CONNECT_TIMEOUT',
      })
    })

    socket.on('message', (msg: any) => {
      if (!msg) {
        return
      }

      // if (msg?.type && msg.type.startsWith('Pusher.Client.')) {
      //   return
      // }

      this.message$.next(msg)
    })

    // update token on reconnect attempt
    socket.on('reconnect_attempt', () => {
      const manager: any = socket.io
      if (manager?.opts) {
        manager.opts.query = options.getQueryParams()
      }

      this.pusher$.next({
        type: 'Client.Pusher.ReconnectAttempted',
      })
    })

    socket.on('reconnecting', (attempt: number) => {
      this.pusher$.next({
        type: 'Client.Pusher.Reconnecting',
        attempt,
      })
    })

    socket.on('disconnect', () => {
      this.pusher$.next({
        type: 'Client.Pusher.Disconnected',
      })
    })

    this.socket = socket
  }

  async send(message: TOutMessage) {
    this.socket.send(message)
  }

  async connect() {
    this.socket.connect()
  }

  async disconnect() {
    this.socket.disconnect()
  }
}
