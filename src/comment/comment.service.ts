import { Inject, Injectable } from '@nestjs/common';
import { Comment } from './models/comment.model';
import { CommentRepository } from './repositories/comment.repository';

@Injectable()
export class CommentService {
  constructor(
    @Inject(CommentRepository)
    private readonly commentRepository: CommentRepository,
  ) {}

  findAll(): Comment[] {
    return this.commentRepository.findAll();
  }

  findById(id: string): Comment | undefined {
    return this.commentRepository.findById(id);
  }

  save(comment: Comment): Comment {
    return this.commentRepository.save(comment);
  }

  remove(id: string): boolean {
    return this.commentRepository.remove(id);
  }
}
