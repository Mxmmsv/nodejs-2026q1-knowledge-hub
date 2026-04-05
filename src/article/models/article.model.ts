import { EntityWithId } from '../../common/persistence/entity-with-id.interface';
import { ArticleStatus } from '../../common/enums/article-status.enum';

export interface Article extends EntityWithId {
  title: string;
  content: string;
  status: ArticleStatus;
  authorId: string | null;
  categoryId: string | null;
  tags: string[];
  createdAt: number;
  updatedAt: number;
}
