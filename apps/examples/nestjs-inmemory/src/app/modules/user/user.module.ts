import { CheepMicroservicesModule } from '@cheep/nestjs'
import { Module } from '@nestjs/common'
import { UserApi } from './types'
import { UserCommandService } from './user.command.service'
import { UserQueryService } from './user.query.service'

@Module({
  imports: [
    CheepMicroservicesModule.forModule<UserApi, never>({
      moduleName: 'User',
      queryHandlers: [UserQueryService],
      commandHandlers: [UserCommandService],
      listenEventsFrom: [],
    }),
  ],
  providers: [UserQueryService, UserCommandService],
})
export class UserModule {}
