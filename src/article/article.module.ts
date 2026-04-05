import { forwardRef, Module } from '@nestjs/common';
import { CommentModule } from '../comment/comment.module';
import { ArticleController } from './article.controller';
import { ArticleService } from './article.service';
import { InMemoryArticleRepository } from './repositories/in-memory-article.repository';
import { ArticleRepository } from './repositories/article.repository';

@Module({
  imports: [forwardRef(() => CommentModule)],
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
