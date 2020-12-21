export type PusherServerEvent =
  | {
      type: 'Server.Pusher.Socket.Connected'
      socketId: string
      userId: string
      appId: string
      userActiveSocketsCount: number
    }
  | {
      type: 'Server.Pusher.Socket.Disconnected'
      socketId: string
      userId: string
      appId: string
      userActiveSocketsCount: number
    }
