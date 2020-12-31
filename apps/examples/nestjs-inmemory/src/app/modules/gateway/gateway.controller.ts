import { CqrsClientService, EventHandlerService } from '@cheep/nestjs'
import {
  Controller,
  Get,
  OnApplicationBootstrap,
  Post,
} from '@nestjs/common'
import { ConsumedApis } from './types'
import * as faker from 'faker'

@Controller()
export class GatewayService implements OnApplicationBootstrap {
  constructor(
    private client: CqrsClientService<ConsumedApis>,
    private events: EventHandlerService<ConsumedApis>,
  ) {}

  onApplicationBootstrap() {
    this.events.event$.subscribe(e =>
      console.log('EVENT', e.type, e.payload),
    )
  }

  @Get('users')
  async getUsers() {
    return this.client.Query.User.getAll()
  }

  @Get('create')
  async createUser() {
    const id = await this.client.Command.User.create({
      user: {
        email: faker.internet.email(),
        name: faker.name.findName(),
      },
    })

    return this.client.Query.User.getById({ id })
  }
}
