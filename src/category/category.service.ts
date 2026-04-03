import { Inject, Injectable } from '@nestjs/common';
import { Category } from './models/category.model';
import { CategoryRepository } from './repositories/category.repository';

@Injectable()
export class CategoryService {
  constructor(
    @Inject(CategoryRepository)
    private readonly categoryRepository: CategoryRepository,
  ) {}

  findAll(): Category[] {
    return this.categoryRepository.findAll();
  }

  findById(id: string): Category | undefined {
    return this.categoryRepository.findById(id);
  }

  save(category: Category): Category {
    return this.categoryRepository.save(category);
  }

  remove(id: string): boolean {
    return this.categoryRepository.remove(id);
  }
}
