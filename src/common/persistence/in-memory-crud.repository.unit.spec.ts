import { describe, expect, it } from 'vitest';
import { InMemoryCrudRepository } from './in-memory-crud.repository';

interface TestEntity {
  id: string;
  value: string;
}

class TestRepository extends InMemoryCrudRepository<TestEntity> {}

describe('InMemoryCrudRepository', () => {
  it('saves, finds, lists, and removes entities', async () => {
    const repository = new TestRepository();
    const entity = { id: 'entity-id', value: 'value' };

    await expect(repository.save(entity)).resolves.toBe(entity);
    await expect(repository.findById(entity.id)).resolves.toBe(entity);
    await expect(repository.findAll()).resolves.toEqual([entity]);
    await expect(repository.remove(entity.id)).resolves.toBe(true);
    await expect(repository.findById(entity.id)).resolves.toBeUndefined();
    await expect(repository.remove(entity.id)).resolves.toBe(false);
  });
});
