import { CrudRepository } from '../../common/persistence/crud.repository';
import { Article } from '../models/article.model';

export abstract class ArticleRepository extends CrudRepository<Article> {}
