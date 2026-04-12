import { Module } from '@nestjs/common';
import { ArticleModule } from '../article/article.module';
import { CommentController } from './comment.controller';
import { CommentService } from './comment.service';
import { PrismaCommentRepository } from './repositories/prisma-comment.repository';
import { CommentRepository } from './repositories/comment.repository';

@Module({
  imports: [ArticleModule],
  controllers: [CommentController],
  providers: [
    CommentService,
    {
      provide: CommentRepository,
      useClass: PrismaCommentRepository,
    },
  ],
  exports: [CommentService, CommentRepository],
})
export class CommentModule {}
