import type {
  Article as PrismaArticleRecord,
  Category as PrismaCategoryRecord,
  Comment as PrismaCommentRecord,
  Tag as PrismaTagRecord,
  User as PrismaUserRecord,
} from '@prisma/client';
import { Article } from '../../article/models/article.model';
import { Category } from '../../category/models/category.model';
import { Comment } from '../../comment/models/comment.model';
import { User } from '../../user/models/user.model';
import { toDomainArticleStatus, toDomainUserRole } from './prisma-enum.mappers';

type PrismaArticleWithTags = PrismaArticleRecord & {
  tags: Pick<PrismaTagRecord, 'name'>[];
};

const toUnixTimestamp = (value: Date): number => value.getTime();

export const toUserModel = (record: PrismaUserRecord): User => ({
  id: record.id,
  login: record.login,
  password: record.password,
  role: toDomainUserRole(record.role),
  createdAt: toUnixTimestamp(record.createdAt),
  updatedAt: toUnixTimestamp(record.updatedAt),
});

export const toArticleModel = (record: PrismaArticleWithTags): Article => ({
  id: record.id,
  title: record.title,
  content: record.content,
  status: toDomainArticleStatus(record.status),
  authorId: record.authorId,
  categoryId: record.categoryId,
  tags: record.tags.map((tag) => tag.name),
  createdAt: toUnixTimestamp(record.createdAt),
  updatedAt: toUnixTimestamp(record.updatedAt),
});

export const toCategoryModel = (record: PrismaCategoryRecord): Category => ({
  id: record.id,
  name: record.name,
  description: record.description,
});

export const toCommentModel = (record: PrismaCommentRecord): Comment => ({
  id: record.id,
  content: record.content,
  articleId: record.articleId,
  authorId: record.authorId,
  createdAt: toUnixTimestamp(record.createdAt),
});
