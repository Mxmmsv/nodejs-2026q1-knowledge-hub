import {
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AppErrorMessages } from '../common/errors/app-error-messages';
import { ArticleStatus } from '../common/enums/article-status.enum';
import { createAuditTimestamps } from '../common/utils/create-audit-timestamps';
import { createEntityId } from '../common/utils/create-entity-id';
import { getCurrentTimestamp } from '../common/utils/get-current-timestamp';
import { CommentService } from '../comment/comment.service';
import {
  CreateArticleDto,
  FindArticlesQueryDto,
  UpdateArticleDto,
} from './dto';
import { Article } from './models/article.model';
import { ArticleRepository } from './repositories/article.repository';

@Injectable()
export class ArticleService {
  constructor(
    @Inject(forwardRef(() => CommentService))
    private readonly commentService: CommentService,
    @Inject(ArticleRepository)
    private readonly articleRepository: ArticleRepository,
  ) {}

  findAll(filters: FindArticlesQueryDto = {}): Article[] {
    return this.articleRepository.findAll().filter((article) => {
      if (filters.status && article.status !== filters.status) {
        return false;
      }

      if (filters.categoryId && article.categoryId !== filters.categoryId) {
        return false;
      }

      if (filters.tag && !article.tags.includes(filters.tag)) {
        return false;
      }

      return true;
    });
  }

  findById(id: string): Article | undefined {
    return this.articleRepository.findById(id);
  }

  getByIdOrThrow(id: string): Article {
    const article = this.articleRepository.findById(id);

    if (!article) {
      throw new NotFoundException(AppErrorMessages.ARTICLE_NOT_FOUND);
    }

    return article;
  }

  create(createArticleDto: CreateArticleDto): Article {
    const article: Article = {
      id: createEntityId(),
      title: createArticleDto.title,
      content: createArticleDto.content,
      status: createArticleDto.status ?? ArticleStatus.DRAFT,
      authorId: createArticleDto.authorId ?? null,
      categoryId: createArticleDto.categoryId ?? null,
      tags: createArticleDto.tags ?? [],
      ...createAuditTimestamps(),
    };

    return this.articleRepository.save(article);
  }

  update(id: string, updateArticleDto: UpdateArticleDto): Article {
    const article = this.getByIdOrThrow(id);

    return this.articleRepository.save({
      ...article,
      ...updateArticleDto,
      categoryId:
        updateArticleDto.categoryId === undefined
          ? article.categoryId
          : updateArticleDto.categoryId,
      tags: updateArticleDto.tags ?? article.tags,
      updatedAt: getCurrentTimestamp(),
    });
  }

  save(article: Article): Article {
    return this.articleRepository.save(article);
  }

  delete(id: string): void {
    this.getByIdOrThrow(id);

    this.commentService.removeByArticleId(id);
    this.articleRepository.remove(id);
  }

  clearAuthorIdByUserId(userId: string): void {
    for (const article of this.articleRepository.findAll()) {
      if (article.authorId !== userId) {
        continue;
      }

      this.articleRepository.save({
        ...article,
        authorId: null,
        updatedAt: getCurrentTimestamp(),
      });
    }
  }

  clearCategoryIdByCategoryId(categoryId: string): void {
    for (const article of this.articleRepository.findAll()) {
      if (article.categoryId !== categoryId) {
        continue;
      }

      this.articleRepository.save({
        ...article,
        categoryId: null,
        updatedAt: getCurrentTimestamp(),
      });
    }
  }
}
