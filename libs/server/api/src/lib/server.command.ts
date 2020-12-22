export type ServerCommand =
  | {
      type: 'Server.Main.FinishGame'
    }
  | {
      type: 'Server.Main.UserOffline'
    }
