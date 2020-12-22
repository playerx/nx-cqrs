export interface MessageMetadata {
  fromAppId: string
  userId?: string
  userRoles?: string[]
  socketId?: string
  [key: string]: string[] | string | number | boolean
}

export type Message<T extends Message<T>> = {
  type: T['type']
}

export interface ReceivedMessage<TPayload> {
  payload: TPayload
  metadata: MessageMetadata
  ack(): Promise<void>
}
