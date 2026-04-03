import { Module } from '@nestjs/common';
import { CommentController } from './comment.controller';
import { CommentService } from './comment.service';
import { InMemoryCommentRepository } from './repositories/in-memory-comment.repository';
import { CommentRepository } from './repositories/comment.repository';

@Module({
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
