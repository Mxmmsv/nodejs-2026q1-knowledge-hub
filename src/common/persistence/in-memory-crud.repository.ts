import { CrudRepository } from './crud.repository';
import { EntityWithId } from './entity-with-id.interface';

export abstract class InMemoryCrudRepository<TEntity extends EntityWithId> implements CrudRepository<TEntity> {
  protected readonly items = new Map<string, TEntity>();

  async findAll(): Promise<TEntity[]> {
    return Array.from(this.items.values());
  }

  async findById(id: string): Promise<TEntity | undefined> {
    return this.items.get(id);
  }

  async save(entity: TEntity): Promise<TEntity> {
    this.items.set(entity.id, entity);

    return entity;
  }

  async remove(id: string): Promise<boolean> {
    return this.items.delete(id);
  }
}
