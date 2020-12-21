import { Observable } from 'rxjs'
import { filter, takeUntil } from 'rxjs/operators'
import { Queue, QueueItem } from '../queue/types'
import { Message, MessageMetadata } from '../types'

export interface EventBusOptions {
  listenRoutePatterns: string[]
}

export class MessageBus<TMessage extends Message<TMessage>> {
  private name: string
  private message$: Observable<QueueItem<TMessage>>

  constructor(private queue: Queue, options: EventBusOptions) {
    this.name = this.queue.name

    const listenPrefixes = options.listenRoutePatterns

    this.message$ = this.queue.message$.pipe(
      filter(x =>
        listenPrefixes.some(prefix => x.route.startsWith(prefix)),
      ),
    )
  }

  async publish(message: TMessage, metadata?: MessageMetadata) {
    await this.queue.publish({
      route: `Message.${message.type}`,
      message,
      metadata: {
        ...metadata,
        source: this.name,
      },
    })
  }

  subscribe(
    action: (
      query: TMessage,
      metadata: MessageMetadata,
    ) => Promise<void>,
  ) {
    this.message$
      .pipe(takeUntil(this.queue.unsubscribe$))
      .subscribe(async x => {
        try {
          await action(<any>x.message, <any>x.metadata ?? {})

          x.complete()
        } catch (err) {
          console.error(err)
          x.complete(false)
        }
      })
  }
}
