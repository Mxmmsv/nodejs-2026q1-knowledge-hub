import { EntityWithId } from './entity-with-id.interface';

export abstract class CrudRepository<TEntity extends EntityWithId> {
  abstract findAll(): TEntity[];

  abstract findById(id: string): TEntity | undefined;

  abstract save(entity: TEntity): TEntity;

  abstract remove(id: string): boolean;
}
