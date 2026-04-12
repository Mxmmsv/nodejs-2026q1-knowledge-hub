import { EntityWithId } from './entity-with-id.interface';

export abstract class CrudRepository<TEntity extends EntityWithId> {
  abstract findAll(): Promise<TEntity[]>;

  abstract findById(id: string): Promise<TEntity | undefined>;

  abstract save(entity: TEntity): Promise<TEntity>;

  abstract remove(id: string): Promise<boolean>;
}
