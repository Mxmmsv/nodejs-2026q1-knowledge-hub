import { Test } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppErrorMessages } from '../common/errors/app-error-messages';
import { NotFoundError } from '../common/errors';
import { Category } from './models/category.model';
import { CategoryRepository } from './repositories/category.repository';
import { CategoryService } from './category.service';

const categoryFixture = (overrides: Partial<Category> = {}): Category => ({
  id: '11111111-1111-4111-8111-111111111111',
  name: 'Category',
  description: 'Description',
  ...overrides,
});

describe('CategoryService', () => {
  let service: CategoryService;
  let categoryRepository: {
    findAll: ReturnType<typeof vi.fn>;
    findById: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
    remove: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    categoryRepository = {
      findAll: vi.fn(),
      findById: vi.fn(),
      save: vi.fn(async (category: Category) => category),
      remove: vi.fn(async () => true),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        CategoryService,
        {
          provide: CategoryRepository,
          useValue: categoryRepository,
        },
      ],
    }).compile();

    service = moduleRef.get(CategoryService);
  });

  it('delegates findAll to the repository', async () => {
    const categories = [categoryFixture()];
    categoryRepository.findAll.mockResolvedValue(categories);

    await expect(service.findAll()).resolves.toBe(categories);
  });

  it('throws when category is not found', async () => {
    categoryRepository.findById.mockResolvedValue(undefined);

    await expect(service.getByIdOrThrow('missing')).rejects.toThrow(
      new NotFoundError(AppErrorMessages.CATEGORY_NOT_FOUND),
    );
  });

  it('creates categories with generated ids', async () => {
    await service.create({ name: 'Node', description: 'Runtime' });

    expect(categoryRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: expect.any(String),
        name: 'Node',
        description: 'Runtime',
      }),
    );
  });

  it('updates existing categories', async () => {
    categoryRepository.findById.mockResolvedValue(categoryFixture());

    await service.update('category-id', { name: 'Updated', description: 'Updated description' });

    expect(categoryRepository.save).toHaveBeenCalledWith({
      id: 'category-id',
      name: 'Updated',
      description: 'Updated description',
    });
  });

  it('checks existence before delete', async () => {
    categoryRepository.findById.mockResolvedValue(categoryFixture());

    await service.delete('category-id');

    expect(categoryRepository.remove).toHaveBeenCalledWith('category-id');
  });
});
