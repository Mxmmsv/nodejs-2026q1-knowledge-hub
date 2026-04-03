import { CrudRepository } from './crud.repository';
import { EntityWithId } from './entity-with-id.interface';

export abstract class InMemoryCrudRepository<TEntity extends EntityWithId>
  implements CrudRepository<TEntity>
{
  protected readonly items = new Map<string, TEntity>();

  findAll(): TEntity[] {
    return Array.from(this.items.values());
  }

  findById(id: string): TEntity | undefined {
    return this.items.get(id);
  }

  save(entity: TEntity): TEntity {
    this.items.set(entity.id, entity);

    return entity;
  }

  remove(id: string): boolean {
    return this.items.delete(id);
  }
}
