export type PusherClientMessage =
  | {
      type: 'Client.Pusher.Connected'
    }
  | {
      type: 'Client.Pusher.Authenticated'
      userId: string
    }
  | {
      type: 'Client.Pusher.Error'
      reasonCode: 'CONNECT_ERROR' | 'CONNECT_TIMEOUT'
      error?: Error
    }
  | {
      type: 'Client.Pusher.ReconnectAttempted'
    }
  | {
      type: 'Client.Pusher.Reconnecting'
      attempt: number
    }
  | {
      type: 'Client.Pusher.Disconnected'
    }
