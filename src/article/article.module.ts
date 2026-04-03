import { Module } from '@nestjs/common';
import { ArticleController } from './article.controller';
import { ArticleService } from './article.service';
import { InMemoryArticleRepository } from './repositories/in-memory-article.repository';
import { ArticleRepository } from './repositories/article.repository';

@Module({
  controllers: [ArticleController],
  providers: [
    ArticleService,
    {
      provide: ArticleRepository,
      useClass: InMemoryArticleRepository,
    },
  ],
  exports: [ArticleService, ArticleRepository],
})
export class ArticleModule {}
