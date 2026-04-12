import { Module } from '@nestjs/common';
import { ArticleModule } from '../article/article.module';
import { CategoryController } from './category.controller';
import { CategoryService } from './category.service';
import { InMemoryCategoryRepository } from './repositories/in-memory-category.repository';
import { PrismaCategoryRepository } from './repositories/prisma-category.repository';
import { CategoryRepository } from './repositories/category.repository';

@Module({
  imports: [ArticleModule],
  controllers: [CategoryController],
  providers: [
    CategoryService,
    PrismaCategoryRepository,
    {
      provide: CategoryRepository,
      useClass: InMemoryCategoryRepository,
    },
  ],
  exports: [CategoryService, CategoryRepository, PrismaCategoryRepository],
})
export class CategoryModule {}
