import { Module } from '@nestjs/common';
import { ArticleModule } from '../article/article.module';
import { CategoryController } from './category.controller';
import { CategoryService } from './category.service';
import { InMemoryCategoryRepository } from './repositories/in-memory-category.repository';
import { CategoryRepository } from './repositories/category.repository';

@Module({
  imports: [ArticleModule],
  controllers: [CategoryController],
  providers: [
    CategoryService,
    {
      provide: CategoryRepository,
      useClass: InMemoryCategoryRepository,
    },
  ],
  exports: [CategoryService, CategoryRepository],
})
export class CategoryModule {}
