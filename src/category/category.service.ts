import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AppErrorMessages } from '../common/errors/app-error-messages';
import { createEntityId } from '../common/utils/create-entity-id';
import { ArticleService } from '../article/article.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dto';
import { Category } from './models/category.model';
import { CategoryRepository } from './repositories/category.repository';

@Injectable()
export class CategoryService {
  constructor(
    private readonly articleService: ArticleService,
    @Inject(CategoryRepository)
    private readonly categoryRepository: CategoryRepository,
  ) {}

  findAll(): Category[] {
    return this.categoryRepository.findAll();
  }

  findById(id: string): Category | undefined {
    return this.categoryRepository.findById(id);
  }

  getByIdOrThrow(id: string): Category {
    const category = this.categoryRepository.findById(id);

    if (!category) {
      throw new NotFoundException(AppErrorMessages.CATEGORY_NOT_FOUND);
    }

    return category;
  }

  create(createCategoryDto: CreateCategoryDto): Category {
    const category: Category = {
      id: createEntityId(),
      name: createCategoryDto.name,
      description: createCategoryDto.description,
    };

    return this.categoryRepository.save(category);
  }

  update(id: string, updateCategoryDto: UpdateCategoryDto): Category {
    this.getByIdOrThrow(id);

    return this.categoryRepository.save({
      id,
      name: updateCategoryDto.name,
      description: updateCategoryDto.description,
    });
  }

  delete(id: string): void {
    this.getByIdOrThrow(id);

    this.articleService.clearCategoryIdByCategoryId(id);
    this.categoryRepository.remove(id);
  }
}
