import { ArticleStatus as PrismaArticleStatus, UserRole as PrismaUserRole } from '@prisma/client';
import { describe, expect, it } from 'vitest';
import { ArticleStatus } from './enums/article-status.enum';
import { UserRole } from './enums/user-role.enum';
import { createErrorResponse } from './swagger/create-error-response';
import { createAuditTimestamps } from './utils/create-audit-timestamps';
import { createEntityId } from './utils/create-entity-id';
import { isValidUuid } from './utils/is-valid-uuid';
import { omitKeys } from './utils/omit-keys';
import {
  toDomainArticleStatus,
  toDomainUserRole,
  toPrismaArticleStatus,
  toPrismaUserRole,
} from '../prisma/mappers/prisma-enum.mappers';
import { toArticleModel, toCategoryModel, toCommentModel, toUserModel } from '../prisma/mappers/prisma-record.mappers';
import { toArticleResponse } from '../article/utils/to-article-response';
import { toCategoryResponse } from '../category/utils/to-category-response';
import { toCommentResponse } from '../comment/utils/to-comment-response';
import { toUserResponse } from '../user/utils/to-user-response';

describe('response mappers', () => {
  it('maps public response shapes and strips user passwords', () => {
    const user = {
      id: 'user-id',
      login: 'user',
      password: 'secret',
      role: UserRole.VIEWER,
      createdAt: 1000,
      updatedAt: 1000,
    };

    expect(toUserResponse(user)).toEqual({
      id: 'user-id',
      login: 'user',
      role: UserRole.VIEWER,
      createdAt: 1000,
      updatedAt: 1000,
    });
    expect(toUserResponse(user)).not.toHaveProperty('password');
    expect(
      toArticleResponse({
        id: 'article-id',
        title: 'Article',
        content: 'Content',
        status: ArticleStatus.DRAFT,
        authorId: null,
        categoryId: null,
        tags: ['node'],
        createdAt: 1000,
        updatedAt: 1000,
      }),
    ).toEqual(
      expect.objectContaining({
        id: 'article-id',
        tags: ['node'],
      }),
    );
    expect(toCategoryResponse({ id: 'category-id', name: 'Category', description: 'Description' })).toEqual({
      id: 'category-id',
      name: 'Category',
      description: 'Description',
    });
    expect(
      toCommentResponse({
        id: 'comment-id',
        content: 'Comment',
        articleId: 'article-id',
        authorId: null,
        createdAt: 1000,
      }),
    ).toEqual({
      id: 'comment-id',
      content: 'Comment',
      articleId: 'article-id',
      authorId: null,
      createdAt: 1000,
    });
  });
});

describe('Prisma mappers', () => {
  it('maps enum values in both directions', () => {
    expect(toDomainUserRole(PrismaUserRole.ADMIN)).toBe(UserRole.ADMIN);
    expect(toDomainUserRole(PrismaUserRole.EDITOR)).toBe(UserRole.EDITOR);
    expect(toDomainUserRole(PrismaUserRole.VIEWER)).toBe(UserRole.VIEWER);
    expect(toPrismaUserRole(UserRole.ADMIN)).toBe(PrismaUserRole.ADMIN);
    expect(toPrismaUserRole(UserRole.EDITOR)).toBe(PrismaUserRole.EDITOR);
    expect(toPrismaUserRole(UserRole.VIEWER)).toBe(PrismaUserRole.VIEWER);
    expect(toDomainArticleStatus(PrismaArticleStatus.DRAFT)).toBe(ArticleStatus.DRAFT);
    expect(toDomainArticleStatus(PrismaArticleStatus.PUBLISHED)).toBe(ArticleStatus.PUBLISHED);
    expect(toDomainArticleStatus(PrismaArticleStatus.ARCHIVED)).toBe(ArticleStatus.ARCHIVED);
    expect(toPrismaArticleStatus(ArticleStatus.DRAFT)).toBe(PrismaArticleStatus.DRAFT);
    expect(toPrismaArticleStatus(ArticleStatus.PUBLISHED)).toBe(PrismaArticleStatus.PUBLISHED);
    expect(toPrismaArticleStatus(ArticleStatus.ARCHIVED)).toBe(PrismaArticleStatus.ARCHIVED);
  });

  it('maps Prisma records into domain models', () => {
    expect(
      toUserModel({
        id: 'user-id',
        login: 'user',
        password: 'hash',
        role: PrismaUserRole.VIEWER,
        createdAt: new Date(1000),
        updatedAt: new Date(2000),
      }),
    ).toEqual({
      id: 'user-id',
      login: 'user',
      password: 'hash',
      role: UserRole.VIEWER,
      createdAt: 1000,
      updatedAt: 2000,
    });
    expect(
      toArticleModel({
        id: 'article-id',
        title: 'Article',
        content: 'Content',
        status: PrismaArticleStatus.PUBLISHED,
        authorId: null,
        categoryId: 'category-id',
        createdAt: new Date(1000),
        updatedAt: new Date(2000),
        tags: [{ name: 'node' }, { name: 'api' }],
      }),
    ).toEqual({
      id: 'article-id',
      title: 'Article',
      content: 'Content',
      status: ArticleStatus.PUBLISHED,
      authorId: null,
      categoryId: 'category-id',
      tags: ['node', 'api'],
      createdAt: 1000,
      updatedAt: 2000,
    });
    expect(toCategoryModel({ id: 'category-id', name: 'Category', description: 'Description' })).toEqual({
      id: 'category-id',
      name: 'Category',
      description: 'Description',
    });
    expect(
      toCommentModel({
        id: 'comment-id',
        content: 'Comment',
        articleId: 'article-id',
        authorId: null,
        createdAt: new Date(1000),
      }),
    ).toEqual({
      id: 'comment-id',
      content: 'Comment',
      articleId: 'article-id',
      authorId: null,
      createdAt: 1000,
    });
  });
});

describe('common utilities', () => {
  it('omits requested keys without mutating the source value', () => {
    const source = { id: '1', password: 'secret', login: 'user' };

    expect(omitKeys(source, ['password'])).toEqual({ id: '1', login: 'user' });
    expect(source).toHaveProperty('password', 'secret');
  });

  it('creates ids, timestamps, uuid checks, and swagger error responses', () => {
    const id = createEntityId();
    const timestamps = createAuditTimestamps();

    expect(isValidUuid(id)).toBe(true);
    expect(isValidUuid('not-a-uuid')).toBe(false);
    expect(timestamps.createdAt).toEqual(expect.any(Number));
    expect(timestamps.updatedAt).toBe(timestamps.createdAt);
    expect(
      createErrorResponse({
        description: 'Bad request',
        example: {
          statusCode: 400,
          error: 'Bad Request',
          message: 'Invalid',
        },
      }),
    ).toEqual({
      description: 'Bad request',
      schema: {
        allOf: [{ $ref: expect.any(String) }],
        example: {
          statusCode: 400,
          error: 'Bad Request',
          message: 'Invalid',
        },
      },
    });
  });
});
