import { forwardRef, Inject, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
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

  async findAllByArticleId(articleId: string): Promise<Comment[]> {
    const comments = await this.commentRepository.findAll();

    return comments.filter((comment) => comment.articleId === articleId);
  }

  async findById(id: string): Promise<Comment | undefined> {
    return this.commentRepository.findById(id);
  }

  async getByIdOrThrow(id: string): Promise<Comment> {
    const comment = await this.commentRepository.findById(id);

    if (!comment) {
      throw new NotFoundException(AppErrorMessages.COMMENT_NOT_FOUND);
    }

    return comment;
  }

  async create(createCommentDto: CreateCommentDto): Promise<Comment> {
    if (!(await this.articleService.findById(createCommentDto.articleId))) {
      throw new UnprocessableEntityException(AppErrorMessages.ARTICLE_NOT_FOUND);
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

  async save(comment: Comment): Promise<Comment> {
    return this.commentRepository.save(comment);
  }

  async delete(id: string): Promise<void> {
    await this.getByIdOrThrow(id);
    await this.commentRepository.remove(id);
  }

  async removeByAuthorId(authorId: string): Promise<void> {
    const comments = await this.commentRepository.findAll();
    const targetComments = comments.filter((comment) => comment.authorId === authorId);

    await Promise.all(targetComments.map((comment) => this.commentRepository.remove(comment.id)));
  }

  async removeByArticleId(articleId: string): Promise<void> {
    const comments = await this.commentRepository.findAll();
    const targetComments = comments.filter((comment) => comment.articleId === articleId);

    await Promise.all(targetComments.map((comment) => this.commentRepository.remove(comment.id)));
  }
}
