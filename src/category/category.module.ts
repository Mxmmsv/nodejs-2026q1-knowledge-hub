import { Module } from '@nestjs/common';
import { CategoryController } from './category.controller';
import { CategoryService } from './category.service';
import { PrismaCategoryRepository } from './repositories/prisma-category.repository';
import { CategoryRepository } from './repositories/category.repository';

@Module({
  controllers: [CategoryController],
  providers: [
    CategoryService,
    {
      provide: CategoryRepository,
      useClass: PrismaCategoryRepository,
    },
  ],
  exports: [CategoryService, CategoryRepository],
})
export class CategoryModule {}
