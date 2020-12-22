import { Observable } from 'rxjs'
import { filter, takeUntil } from 'rxjs/operators'
import { Queue } from '../queue/types'
import { Message, MessageMetadata } from '../types'

// subscriber
function subscribeMessages<TMessage>(
  messageType: PublishMessageType | 'All',
  options: MessageBusOptions<TMessage>,
  action: SubscribeMessageAction<TMessage>,
) {
  const {
    queue,
    patterns: subscribePatterns,
    completeBeforeProcessing = false,
    unsubscribe$,
  } = options

  if (!subscribePatterns.length) {
    throw new Error('Please provide at least one subscribe pattern')
  }

  const prefix = messageType === 'All' ? '' : `${messageType}.`

  const data$ = prefix
    ? queue.message$.pipe(
        filter(x => x.route.startsWith(this.messageType)),
      )
    : queue.message$

  if (subscribePatterns.length) {
    queue.listenPatterns(subscribePatterns)
  }

  const subscription = data$
    .pipe(takeUntil(unsubscribe$))
    .subscribe(async x => {
      try {
        if (completeBeforeProcessing) {
          x.complete()
        }

        await action(<any>x.message, <any>x.metadata ?? {})

        if (!completeBeforeProcessing) {
          x.complete()
        }
      } catch (err) {
        console.error(err)
        x.complete(false)
      }
    })

  return () => subscription.unsubscribe()
}

export function subscribeAllMessages<TMessage>(
  options: SubscribeOptions<TMessage>,
  action: SubscribeMessageAction<TMessage>,
) {
  return subscribeMessages('All', options, action)
}

export function subscribeCommands<TCommand>(
  options: SubscribeOptions<TCommand>,
  action: SubscribeMessageAction<TCommand>,
) {
  return subscribeMessages('Command', options, action)
}

export function subscribeQueries<TQuery>(
  options: SubscribeOptions<TQuery>,
  action: SubscribeMessageAction<TQuery>,
) {
  return subscribeMessages(
    'Query',
    {
      ...options,
      completeBeforeProcessing: true,
    },
    action,
  )
}

export function subscribeEvents<TEvent>(
  options: SubscribeOptions<TEvent>,
  action: SubscribeMessageAction<TEvent>,
) {
  return subscribeMessages('Event', options, action)
}

// publisher
export function createPublisher<TMessage extends Message<TMessage>>(
  queue: Queue,
): Publisher<TMessage> {
  const publishMessage = async <TResult = void>(
    messageType: PublishMessageType,
    message: TMessage,
    metadata?: MessageMetadata,
  ) => {
    const result = await queue.publish({
      route: `${messageType}.${message.type}`,
      message,
      metadata: {
        ...metadata,
        source: this.queue.moduleName,
      },
    })

    if (messageType === 'Event') {
      return
    }

    return <TResult>result
  }

  return {
    publishMessage,

    publishCommand: (command: TMessage, metadata?: MessageMetadata) =>
      publishMessage('Command', command, metadata),

    publishQuery: (query: TMessage, metadata?: MessageMetadata) =>
      publishMessage('Query', query, metadata),

    publishEvent: (event: TMessage, metadata?: MessageMetadata) =>
      publishMessage('Event', event, metadata),
  }
}

// types
export type PublishMessageType = 'Command' | 'Query' | 'Event'

type SubscribeMessageAction<TMessage> = (
  query: TMessage,
  metadata: MessageMetadata,
) => Promise<void>

interface MessageBusOptions<TMessage> {
  queue: Queue
  patterns: string[]
  completeBeforeProcessing?: boolean
  guards: SubscriberGuard<TMessage>[]
  unsubscribe$?: Observable<any>
}

export type SubscribeOptions<TMessage> = Omit<
  MessageBusOptions<TMessage>,
  'completeBeforeProcessing'
>

export type SubscriberGuard<TMessage> = (
  message: TMessage,
  metadata: MessageMetadata,
) => boolean

export interface Publisher<TMessage = any> {
  publishMessage<TResult = void>(
    messageType: PublishMessageType,
    message: TMessage,
    metadata?: MessageMetadata,
  ): Promise<TResult>

  publishCommand<TResult = void>(
    command: TMessage,
    metadata?: MessageMetadata,
  ): Promise<TResult>

  publishQuery<TResult = void>(
    command: TMessage,
    metadata?: MessageMetadata,
  ): Promise<TResult>

  publishEvent(
    command: TMessage,
    metadata?: MessageMetadata,
  ): Promise<void>
}
