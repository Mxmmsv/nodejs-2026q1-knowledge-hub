import { ArticleResponseDto } from '../dto';
import { Article } from '../models/article.model';

export const toArticleResponse = (article: Article): ArticleResponseDto => ({
  id: article.id,
  title: article.title,
  content: article.content,
  status: article.status,
  authorId: article.authorId,
  categoryId: article.categoryId,
  tags: article.tags,
  createdAt: article.createdAt,
  updatedAt: article.updatedAt,
});
