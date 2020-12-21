export type ServerMessage =
  | {
      type: 'Server.UserOnline'
    }
  | {
      type: 'Server.UserOffline'
    }
