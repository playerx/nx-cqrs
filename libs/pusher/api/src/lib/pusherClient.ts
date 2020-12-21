import { Observable } from 'rxjs'
import { PusherClientMessage } from './pusherClient.message'

export interface PusherClient<
  TInMessage,
  TOutMessage,
  TMetadata = any
> {
  connect(): Promise<void>
  disconnect(): Promise<void>

  pusher$: Observable<PusherClientMessage>
  message$: Observable<TInMessage>

  send(message: TOutMessage, metadata?: TMetadata): Promise<void>
}
