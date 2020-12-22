import { Observable } from 'rxjs'
import { MessageMetadata } from '../types'

export interface Queue {
  moduleName: string

  message$: Observable<QueueItem<any>>
  unsubscribe$: Observable<any>

  publish<TResult>(props: PublishProps<any>): Promise<TResult>

  listenPatterns(patterns: string[]): void

  dispose(): void
}

export interface PublishProps<T> {
  route: string
  message: T

  metadata: MessageMetadata

  rpc?: {
    enabled: boolean
    timeout: number
  }
}

export interface QueueItem<T> {
  route: string
  message: T

  metadata: MessageMetadata

  // used with correlationId when its RPC
  replyTo?: string
  correlationId?: string

  complete: (isSuccess?: boolean) => void
  sendReply(result: any, metadata: MessageMetadata): Promise<void>
}

// export type Metadata = { [key: string]: string | Metadata }

// export interface PendingItem<T> {
//   message: T
//   metadata: {}
//   complete(isSuccess?: boolean): void
//   isWaitingForReply: boolean
//   sendReplyAction(result: any): Promise<void>
// }
