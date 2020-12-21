import * as amqp from 'amqp-connection-manager'
import { ConfirmChannel } from 'amqplib'
import { Observable, Subject } from 'rxjs'
import { filter } from 'rxjs/operators'
import { PublishProps, Queue, QueueItem } from './types'

interface Options {
  name: string
  amqpConnectionString: string
  publishExchangeName: string
  newId: () => string
  listenRoutePatterns: string[]
}

export class RabbitMQQueue<TMessage> implements Queue {
  message$: Observable<QueueItem<TMessage>>
  unsubscribe$ = new Subject()

  get name() {
    return this.subscribeQueueName
  }

  private channel: amqp.ChannelWrapper
  private internal$ = new Subject<QueueItem<TMessage>>()
  private internalResponse$ = new Subject<QueueItem<TMessage>>()
  private rpcResponseQueueName: string
  private subscribeQueueName: string

  constructor(private options: Options) {
    const {
      name,
      newId,
      listenRoutePatterns: listenPatterns,
    } = this.options

    this.subscribeQueueName = name
    this.rpcResponseQueueName = `${name}Response-${newId()}`

    this.message$ = this.internal$

    this.channel = this.init(
      listenPatterns.map(x => x + '#'),
      this.rpcResponseQueueName,
    )

    this.setupSubscription()
  }

  private init(listenPatterns: string[], responseQueueName) {
    const { amqpConnectionString, publishExchangeName } = this.options

    const connection = amqp.connect([amqpConnectionString])

    const channel = connection.createChannel({
      setup: (c: ConfirmChannel) =>
        Promise.all([
          // Hub Exchange
          c.assertExchange(publishExchangeName, 'topic', {
            durable: true,
          }),

          // Queues
          c.assertQueue(this.subscribeQueueName, { durable: true }),

          // Bindings
          ...listenPatterns.map(patern =>
            c.bindQueue(
              this.subscribeQueueName,
              publishExchangeName,
              patern,
            ),
          ),

          // Response queue
          c.assertQueue(responseQueueName, {
            durable: true,
            exclusive: true,
          }),
        ]),
    })

    return channel
  }

  private setupSubscription() {
    const setup = (x: ConfirmChannel) => {
      x.consume(this.subscribeQueueName, msg => {
        if (!msg) {
          return
        }

        const message: TMessage = msg.content
          ? JSON.parse(msg.content.toString())
          : null

        const replyTo = msg.properties.replyTo
        const correlationId = msg.properties.correlationId

        this.internal$.next({
          message,
          route: msg.fields.routingKey,
          metadata: msg.properties.headers,
          correlationId,
          replyTo,
          complete: (isSuccess = true) => {
            if (isSuccess) {
              this.channel.ack(msg)
            } else {
              this.channel.nack(msg)
            }
          },
          sendReply: replyTo
            ? async (result, metadata) =>
                this.channel.sendToQueue(
                  replyTo,
                  Buffer.from(JSON.stringify(result ?? null)),
                  {
                    correlationId,
                    headers: metadata,
                  },
                )
            : () => Promise.resolve(),
        })
      })

      x.consume(this.rpcResponseQueueName, msg => {
        if (!msg) {
          return
        }

        const message: TMessage = msg.content
          ? JSON.parse(msg.content.toString())
          : null

        const correlationId = msg.properties.correlationId

        x.ack(msg)

        this.internalResponse$.next({
          message,
          route: msg.fields.routingKey,
          metadata: msg.properties.headers,
          correlationId,
          complete: () => null,
          sendReply: () => Promise.resolve(),
        })
      })
    }

    this.channel.addSetup(setup)
  }

  async publish<TResult>(
    props: PublishProps<TMessage>,
  ): Promise<TResult> {
    const { publishExchangeName, newId } = this.options

    const { route, message, metadata, rpc } = props

    const correlationId = rpc ? newId() : undefined

    const result = rpc?.enabled
      ? new Promise<TResult>((resolve, reject) => {
          const sub = this.internalResponse$
            .pipe(filter(x => x.correlationId === correlationId))
            .subscribe(x => {
              sub.unsubscribe()
              clearTimeout(timer)

              resolve(<TResult>(<unknown>x.message))

              x.complete()
            })

          const timer = setTimeout(() => {
            sub.unsubscribe()
            clearTimeout(timer)

            reject('QUEUE_RPC_TIMEOUT')
          }, rpc.timeout)
        })
      : Promise.resolve(null!)

    await this.channel.publish(
      publishExchangeName,
      route,
      Buffer.from(JSON.stringify(message)),
      {
        headers: metadata,
        ...(rpc?.enabled
          ? {
              replyTo: this.rpcResponseQueueName,
              correlationId,
            }
          : null),
      },
    )

    return result
  }

  dispose() {
    this.unsubscribe$.next()
    this.unsubscribe$.complete()
  }
}
