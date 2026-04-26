import { Inject, Injectable } from '@nestjs/common';
import { AppErrorMessages } from '../common/errors/app-error-messages';
import { NotFoundError } from '../common/errors';
import { createEntityId } from '../common/utils/create-entity-id';
import { CreateCategoryDto, UpdateCategoryDto } from './dto';
import { Category } from './models/category.model';
import { CategoryRepository } from './repositories/category.repository';

@Injectable()
export class CategoryService {
  constructor(
    @Inject(CategoryRepository)
    private readonly categoryRepository: CategoryRepository,
  ) {}

  async findAll(): Promise<Category[]> {
    return this.categoryRepository.findAll();
  }

  async findById(id: string): Promise<Category | undefined> {
    return this.categoryRepository.findById(id);
  }

  async getByIdOrThrow(id: string): Promise<Category> {
    const category = await this.categoryRepository.findById(id);

    if (!category) {
      throw new NotFoundError(AppErrorMessages.CATEGORY_NOT_FOUND);
    }

    return category;
  }

  async create(createCategoryDto: CreateCategoryDto): Promise<Category> {
    const category: Category = {
      id: createEntityId(),
      name: createCategoryDto.name,
      description: createCategoryDto.description,
    };

    return this.categoryRepository.save(category);
  }

  async update(id: string, updateCategoryDto: UpdateCategoryDto): Promise<Category> {
    await this.getByIdOrThrow(id);

    return this.categoryRepository.save({
      id,
      name: updateCategoryDto.name,
      description: updateCategoryDto.description,
    });
  }

  async delete(id: string): Promise<void> {
    await this.getByIdOrThrow(id);
    await this.categoryRepository.remove(id);
  }
}
