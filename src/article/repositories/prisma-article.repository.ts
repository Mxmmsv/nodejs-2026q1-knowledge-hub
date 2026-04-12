import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { toPrismaArticleStatus } from '../../prisma/mappers/prisma-enum.mappers';
import { toArticleModel } from '../../prisma/mappers/prisma-record.mappers';
import { Article } from '../models/article.model';
import { ArticleRepository } from './article.repository';

const articleInclude = {
  tags: {
    select: {
      name: true,
    },
  },
} as const;

const toArticleTagWrites = (tags: string[]) => ({
  connectOrCreate: tags.map((name) => ({
    where: { name },
    create: { name },
  })),
});

@Injectable()
export class PrismaArticleRepository extends ArticleRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findAll(): Promise<Article[]> {
    const articles = await this.prisma.article.findMany({
      include: articleInclude,
      orderBy: { createdAt: 'asc' },
    });

    return articles.map(toArticleModel);
  }

  async findById(id: string): Promise<Article | undefined> {
    const article = await this.prisma.article.findUnique({
      where: { id },
      include: articleInclude,
    });

    return article ? toArticleModel(article) : undefined;
  }

  async save(article: Article): Promise<Article> {
    const savedArticle = await this.prisma.article.upsert({
      where: { id: article.id },
      update: {
        title: article.title,
        content: article.content,
        status: toPrismaArticleStatus(article.status),
        authorId: article.authorId,
        categoryId: article.categoryId,
        updatedAt: new Date(article.updatedAt),
        tags: {
          set: [],
          ...toArticleTagWrites(article.tags),
        },
      },
      create: {
        id: article.id,
        title: article.title,
        content: article.content,
        status: toPrismaArticleStatus(article.status),
        authorId: article.authorId,
        categoryId: article.categoryId,
        createdAt: new Date(article.createdAt),
        updatedAt: new Date(article.updatedAt),
        tags: toArticleTagWrites(article.tags),
      },
      include: articleInclude,
    });

    return toArticleModel(savedArticle);
  }

  async remove(id: string): Promise<boolean> {
    const result = await this.prisma.article.deleteMany({
      where: { id },
    });

    return result.count > 0;
  }
}
