import { CrudRepository } from '../../common/persistence/crud.repository';
import { Category } from '../models/category.model';

export abstract class CategoryRepository extends CrudRepository<Category> {}
