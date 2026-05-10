import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { ArticleModule } from './article/article.module';
import { AiModule } from './ai/ai.module';
import { AppController } from './app.controller';
import { AuthModule } from './auth/auth.module';
import { CategoryModule } from './category/category.module';
import { CommentModule } from './comment/comment.module';
import { LoggerModule } from './common/logger';
import { RequestLoggerMiddleware } from './common/middleware/request-logger.middleware';
import { PrismaModule } from './prisma/prisma.module';
import { RagModule } from './ai/rag/rag.module';
import { UserModule } from './user/user.module';

@Module({
  controllers: [AppController],
  imports: [
    LoggerModule,
    PrismaModule,
    AuthModule,
    UserModule,
    ArticleModule,
    CategoryModule,
    CommentModule,
    AiModule,
    RagModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestLoggerMiddleware).forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}
