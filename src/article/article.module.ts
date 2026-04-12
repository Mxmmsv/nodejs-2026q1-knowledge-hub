import { Module } from '@nestjs/common';
import { ArticleController } from './article.controller';
import { ArticleService } from './article.service';
import { PrismaArticleRepository } from './repositories/prisma-article.repository';
import { ArticleRepository } from './repositories/article.repository';

@Module({
  controllers: [ArticleController],
  providers: [
    ArticleService,
    {
      provide: ArticleRepository,
      useClass: PrismaArticleRepository,
    },
  ],
  exports: [ArticleService, ArticleRepository],
})
export class ArticleModule {}
