import * as amqp from 'amqp-connection-manager'
import { ConfirmChannel } from 'amqplib'
import { Observable, Subject } from 'rxjs'
import { filter } from 'rxjs/operators'
import { PublishProps, Queue, QueueItem } from './types'

interface Options {
  moduleName: string
  amqpConnectionString: string
  publishExchangeName: string
  newId: () => string
}

export class RabbitMQQueue<TMessage> implements Queue {
  message$: Observable<QueueItem<TMessage>>
  unsubscribe$ = new Subject()
  moduleName: string

  private channel: amqp.ChannelWrapper
  private internal$ = new Subject<QueueItem<TMessage>>()
  private internalResponse$ = new Subject<QueueItem<TMessage>>()
  private rpcResponseQueueName: string

  constructor(private options: Options) {
    const { moduleName, newId } = this.options

    this.moduleName = moduleName
    this.rpcResponseQueueName = `${moduleName}Response-${newId()}`

    this.message$ = this.internal$

    this.channel = this.init(this.rpcResponseQueueName)

    this.setupSubscription()
  }

  private init(responseQueueName) {
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
          c.assertQueue(this.moduleName, { durable: true }),

          // // Bindings
          // ...listenPatterns.map(patern =>
          //   c.bindQueue(this.moduleName, publishExchangeName, patern),
          // ),

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
      x.consume(this.moduleName, msg => {
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
          metadata: <any>msg.properties.headers,
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
          metadata: <any>msg.properties.headers,
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

  listenPatterns(patterns: string[]) {
    if (!patterns?.length) {
      return
    }

    const rabbitMqPatterns = patterns.map(x => x + '#')

    this.channel.addSetup((c: ConfirmChannel) => {
      rabbitMqPatterns.map(patern =>
        c.bindQueue(
          this.moduleName,
          this.options.publishExchangeName,
          patern,
        ),
      )
    })
  }

  dispose() {
    this.unsubscribe$.next()
    this.unsubscribe$.complete()
  }
}
