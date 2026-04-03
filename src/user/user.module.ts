import { Module } from '@nestjs/common';
import { InMemoryUserRepository } from './repositories/in-memory-user.repository';
import { UserRepository } from './repositories/user.repository';
import { UserController } from './user.controller';
import { UserService } from './user.service';

@Module({
  controllers: [UserController],
  providers: [
    UserService,
    {
      provide: UserRepository,
      useClass: InMemoryUserRepository,
    },
  ],
  exports: [UserService, UserRepository],
})
export class UserModule {}
