import { Message } from '@nx-cqrs/shared'

export type PusherServerCommand<
  TClientMessage extends Message<TClientMessage>
> =
  | {
      type: 'Server.Pusher.SendToSocket'
      socketId: string
      message: TClientMessage
    }
  // | {
  //     type: 'Pusher.SendToNamespace'
  //     namespace: string
  //     message: TCustomOutputMessage
  //   }
  | {
      type: 'Server.Pusher.SendToEveryone'
      message: TClientMessage
    }

  // Channel api
  | {
      type: 'Server.Pusher.SendToChannel'
      channel: string
      message: TClientMessage
    }
  | {
      type: 'Server.Pusher.JoinChannels'
      socketId: string
      channels: string[]
    }
  | {
      type: 'Server.Pusher.LeaveChannels'
      socketId: string
      channels: string[]
    }
