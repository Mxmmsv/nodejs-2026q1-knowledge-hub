import { forwardRef, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AppErrorMessages } from '../common/errors/app-error-messages';
import { ArticleStatus } from '../common/enums/article-status.enum';
import { createAuditTimestamps } from '../common/utils/create-audit-timestamps';
import { createEntityId } from '../common/utils/create-entity-id';
import { getCurrentTimestamp } from '../common/utils/get-current-timestamp';
import { CommentService } from '../comment/comment.service';
import { CreateArticleDto, FindArticlesQueryDto, UpdateArticleDto } from './dto';
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

  async findAll(filters: FindArticlesQueryDto = {}): Promise<Article[]> {
    const articles = await this.articleRepository.findAll();

    return articles.filter((article) => {
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

  async findById(id: string): Promise<Article | undefined> {
    return this.articleRepository.findById(id);
  }

  async getByIdOrThrow(id: string): Promise<Article> {
    const article = await this.articleRepository.findById(id);

    if (!article) {
      throw new NotFoundException(AppErrorMessages.ARTICLE_NOT_FOUND);
    }

    return article;
  }

  async create(createArticleDto: CreateArticleDto): Promise<Article> {
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

  async update(id: string, updateArticleDto: UpdateArticleDto): Promise<Article> {
    const article = await this.getByIdOrThrow(id);

    return this.articleRepository.save({
      ...article,
      ...updateArticleDto,
      categoryId: updateArticleDto.categoryId === undefined ? article.categoryId : updateArticleDto.categoryId,
      tags: updateArticleDto.tags ?? article.tags,
      updatedAt: getCurrentTimestamp(),
    });
  }

  async save(article: Article): Promise<Article> {
    return this.articleRepository.save(article);
  }

  async delete(id: string): Promise<void> {
    await this.getByIdOrThrow(id);

    await this.commentService.removeByArticleId(id);
    await this.articleRepository.remove(id);
  }

  async clearAuthorIdByUserId(userId: string): Promise<void> {
    const articles = await this.articleRepository.findAll();
    const targetArticles = articles.filter((article) => article.authorId === userId);

    await Promise.all(
      targetArticles.map((article) =>
        this.articleRepository.save({
          ...article,
          authorId: null,
          updatedAt: getCurrentTimestamp(),
        }),
      ),
    );
  }

  async clearCategoryIdByCategoryId(categoryId: string): Promise<void> {
    const articles = await this.articleRepository.findAll();
    const targetArticles = articles.filter((article) => article.categoryId === categoryId);

    await Promise.all(
      targetArticles.map((article) =>
        this.articleRepository.save({
          ...article,
          categoryId: null,
          updatedAt: getCurrentTimestamp(),
        }),
      ),
    );
  }
}
