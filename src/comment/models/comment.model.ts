import { EntityWithId } from '../../common/persistence/entity-with-id.interface';

export interface Comment extends EntityWithId {
  content: string;
  articleId: string;
  authorId: string | null;
  createdAt: number;
}
