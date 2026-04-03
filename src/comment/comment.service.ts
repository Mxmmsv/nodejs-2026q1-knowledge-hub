import {
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { AppErrorMessages } from '../common/errors/app-error-messages';
import { createEntityId } from '../common/utils/create-entity-id';
import { getCurrentTimestamp } from '../common/utils/get-current-timestamp';
import { ArticleService } from '../article/article.service';
import { CreateCommentDto } from './dto';
import { Comment } from './models/comment.model';
import { CommentRepository } from './repositories/comment.repository';

@Injectable()
export class CommentService {
  constructor(
    @Inject(forwardRef(() => ArticleService))
    private readonly articleService: ArticleService,
    @Inject(CommentRepository)
    private readonly commentRepository: CommentRepository,
  ) {}

  findAllByArticleId(articleId: string): Comment[] {
    return this.commentRepository
      .findAll()
      .filter((comment) => comment.articleId === articleId);
  }

  findById(id: string): Comment | undefined {
    return this.commentRepository.findById(id);
  }

  getByIdOrThrow(id: string): Comment {
    const comment = this.commentRepository.findById(id);

    if (!comment) {
      throw new NotFoundException(AppErrorMessages.COMMENT_NOT_FOUND);
    }

    return comment;
  }

  create(createCommentDto: CreateCommentDto): Comment {
    if (!this.articleService.findById(createCommentDto.articleId)) {
      throw new UnprocessableEntityException(
        AppErrorMessages.ARTICLE_NOT_FOUND,
      );
    }

    const comment: Comment = {
      id: createEntityId(),
      content: createCommentDto.content,
      articleId: createCommentDto.articleId,
      authorId: createCommentDto.authorId ?? null,
      createdAt: getCurrentTimestamp(),
    };

    return this.commentRepository.save(comment);
  }

  save(comment: Comment): Comment {
    return this.commentRepository.save(comment);
  }

  delete(id: string): void {
    this.getByIdOrThrow(id);
    this.commentRepository.remove(id);
  }

  removeByAuthorId(authorId: string): void {
    for (const comment of this.commentRepository.findAll()) {
      if (comment.authorId === authorId) {
        this.commentRepository.remove(comment.id);
      }
    }
  }

  removeByArticleId(articleId: string): void {
    for (const comment of this.commentRepository.findAll()) {
      if (comment.articleId === articleId) {
        this.commentRepository.remove(comment.id);
      }
    }
  }
}
