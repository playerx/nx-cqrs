import { Publisher } from '@nx-cqrs/shared'

export type PusherServerQuery = {
  type: 'User.GetConnectedUsers'
} & Parameters<typeof getConnectedUsers>[0]

async function getConnectedUsers(
  publisher: Publisher<any>,
  props: {
    appId: string
  },
): Promise<{
  userId: string
  activeSocketsCount: number
}> {
  return publisher.publishQuery(props)
}

export const pusherQuery = (
  publisher: Publisher<PusherServerQuery>,
) => ({
  getConnectedUsers: getConnectedUsers(publisher, props),
})
