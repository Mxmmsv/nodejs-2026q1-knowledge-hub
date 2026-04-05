import { EntityWithId } from '../../common/persistence/entity-with-id.interface';

export interface Category extends EntityWithId {
  name: string;
  description: string;
}
