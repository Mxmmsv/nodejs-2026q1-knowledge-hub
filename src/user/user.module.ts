import { Module } from '@nestjs/common';
import { ArticleModule } from '../article/article.module';
import { CommentModule } from '../comment/comment.module';
import { PrismaUserRepository } from './repositories/prisma-user.repository';
import { InMemoryUserRepository } from './repositories/in-memory-user.repository';
import { UserRepository } from './repositories/user.repository';
import { UserController } from './user.controller';
import { UserService } from './user.service';

@Module({
  imports: [ArticleModule, CommentModule],
  controllers: [UserController],
  providers: [
    UserService,
    {
      provide: UserRepository,
      useClass: PrismaUserRepository,
    },
  ],
  exports: [UserService, UserRepository],
})
export class UserModule {}
