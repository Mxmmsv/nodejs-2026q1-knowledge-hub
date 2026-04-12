import { forwardRef, Module } from '@nestjs/common';
import { ArticleModule } from '../article/article.module';
import { CommentController } from './comment.controller';
import { CommentService } from './comment.service';
import { InMemoryCommentRepository } from './repositories/in-memory-comment.repository';
import { PrismaCommentRepository } from './repositories/prisma-comment.repository';
import { CommentRepository } from './repositories/comment.repository';

@Module({
  imports: [forwardRef(() => ArticleModule)],
  controllers: [CommentController],
  providers: [
    CommentService,
    PrismaCommentRepository,
    {
      provide: CommentRepository,
      useClass: InMemoryCommentRepository,
    },
  ],
  exports: [CommentService, CommentRepository, PrismaCommentRepository],
})
export class CommentModule {}
