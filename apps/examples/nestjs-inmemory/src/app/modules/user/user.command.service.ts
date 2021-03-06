import { CheepEvents } from '@cheep/nestjs'
import { Injectable } from '@nestjs/common'
import { User, UserApi } from './types'
import * as faker from 'faker'

@Injectable()
export class UserCommandService {
  constructor(private events: CheepEvents<never, UserApi>) {}
  async create(props: { user: Omit<User, 'id'> }): Promise<number> {
    const newUser = {
      ...props.user,
      id: faker.random.number(),
    }
    this.events.publish.User.created(newUser)
    return newUser.id
  }

  private async thisIsPrivate(x: boolean): Promise<User> {
    return { id: 123, name: 'EXPLODE!', email: x ? '' : '' }
  }
}
