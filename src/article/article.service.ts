import { Inject, Injectable } from '@nestjs/common';
import { getCurrentTimestamp } from '../common/utils/get-current-timestamp';
import { Article } from './models/article.model';
import { ArticleRepository } from './repositories/article.repository';

@Injectable()
export class ArticleService {
  constructor(
    @Inject(ArticleRepository)
    private readonly articleRepository: ArticleRepository,
  ) {}

  findAll(): Article[] {
    return this.articleRepository.findAll();
  }

  findById(id: string): Article | undefined {
    return this.articleRepository.findById(id);
  }

  save(article: Article): Article {
    return this.articleRepository.save(article);
  }

  remove(id: string): boolean {
    return this.articleRepository.remove(id);
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
