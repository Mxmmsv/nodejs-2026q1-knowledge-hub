import { forwardRef, Module } from '@nestjs/common';
import { ArticleModule } from '../article/article.module';
import { CommentController } from './comment.controller';
import { CommentService } from './comment.service';
import { InMemoryCommentRepository } from './repositories/in-memory-comment.repository';
import { CommentRepository } from './repositories/comment.repository';

@Module({
  imports: [forwardRef(() => ArticleModule)],
  controllers: [CommentController],
  providers: [
    CommentService,
    {
      provide: CommentRepository,
      useClass: InMemoryCommentRepository,
    },
  ],
  exports: [CommentService, CommentRepository],
})
export class CommentModule {}
