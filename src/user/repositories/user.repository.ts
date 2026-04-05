import { CrudRepository } from '../../common/persistence/crud.repository';
import { User } from '../models/user.model';

export abstract class UserRepository extends CrudRepository<User> {}
