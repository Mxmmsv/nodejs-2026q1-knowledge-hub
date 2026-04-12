import { Injectable } from '@nestjs/common';
import { InMemoryCrudRepository } from '../../common/persistence/in-memory-crud.repository';
import { FindArticlesQueryDto } from '../dto';
import { Article } from '../models/article.model';
import { ArticleRepository } from './article.repository';

@Injectable()
export class InMemoryArticleRepository extends InMemoryCrudRepository<Article> implements ArticleRepository {
  async findAll(filters: FindArticlesQueryDto = {}): Promise<Article[]> {
    const articles = await super.findAll();

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
}
