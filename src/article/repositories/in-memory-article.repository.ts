import { Injectable } from '@nestjs/common';
import { InMemoryCrudRepository } from '../../common/persistence/in-memory-crud.repository';
import { Article } from '../models/article.model';
import { ArticleRepository } from './article.repository';

@Injectable()
export class InMemoryArticleRepository extends InMemoryCrudRepository<Article> implements ArticleRepository {}
