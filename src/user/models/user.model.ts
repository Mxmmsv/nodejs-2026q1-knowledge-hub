import { UserRole } from '../../common/enums/user-role.enum';
import { EntityWithId } from '../../common/persistence/entity-with-id.interface';

export interface User extends EntityWithId {
  login: string;
  password: string;
  role: UserRole;
  createdAt: number;
  updatedAt: number;
}
