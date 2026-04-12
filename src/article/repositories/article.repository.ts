import { CrudRepository } from '../../common/persistence/crud.repository';
import { FindArticlesQueryDto } from '../dto';
import { Article } from '../models/article.model';

export abstract class ArticleRepository extends CrudRepository<Article> {
  abstract findAll(filters?: FindArticlesQueryDto): Promise<Article[]>;
}
