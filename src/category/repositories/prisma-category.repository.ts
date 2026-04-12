import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { toCategoryModel } from '../../prisma/mappers/prisma-record.mappers';
import { Category } from '../models/category.model';
import { CategoryRepository } from './category.repository';

@Injectable()
export class PrismaCategoryRepository extends CategoryRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findAll(): Promise<Category[]> {
    const categories = await this.prisma.category.findMany({
      orderBy: { name: 'asc' },
    });

    return categories.map(toCategoryModel);
  }

  async findById(id: string): Promise<Category | undefined> {
    const category = await this.prisma.category.findUnique({
      where: { id },
    });

    return category ? toCategoryModel(category) : undefined;
  }

  async save(category: Category): Promise<Category> {
    const savedCategory = await this.prisma.category.upsert({
      where: { id: category.id },
      update: {
        name: category.name,
        description: category.description,
      },
      create: {
        id: category.id,
        name: category.name,
        description: category.description,
      },
    });

    return toCategoryModel(savedCategory);
  }

  async remove(id: string): Promise<boolean> {
    const result = await this.prisma.category.deleteMany({
      where: { id },
    });

    return result.count > 0;
  }
}
