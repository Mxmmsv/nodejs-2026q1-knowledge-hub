import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const prisma = {
    $disconnect: vi.fn(),
    article: {
      deleteMany: vi.fn(),
      upsert: vi.fn(),
    },
    category: {
      deleteMany: vi.fn(),
      upsert: vi.fn(),
    },
    comment: {
      deleteMany: vi.fn(),
      upsert: vi.fn(),
    },
    refreshSession: {
      deleteMany: vi.fn(),
    },
    tag: {
      deleteMany: vi.fn(),
      upsert: vi.fn(),
    },
    user: {
      deleteMany: vi.fn(),
      upsert: vi.fn(),
    },
  };

  return {
    hash: vi.fn(),
    prisma,
    PrismaClient: vi.fn(function PrismaClient() {
      return prisma;
    }),
  };
});

vi.mock('@prisma/client', () => ({
  ArticleStatus: {
    ARCHIVED: 'ARCHIVED',
    DRAFT: 'DRAFT',
    PUBLISHED: 'PUBLISHED',
  },
  PrismaClient: mocks.PrismaClient,
  UserRole: {
    ADMIN: 'ADMIN',
    EDITOR: 'EDITOR',
    VIEWER: 'VIEWER',
  },
}));

vi.mock('bcrypt', () => ({
  hash: mocks.hash,
}));

import { seedDatabase } from './seed-database';

const users = [
  { id: '11111111-1111-4111-8111-111111111111', login: 'seed_admin' },
  { id: '22222222-2222-4222-8222-222222222222', login: 'seed_editor' },
  { id: '33333333-3333-4333-8333-333333333333', login: 'seed_viewer' },
];

const categories = [
  { id: '44444444-4444-4444-8444-444444444444', name: 'Backend' },
  { id: '55555555-5555-4555-8555-555555555555', name: 'DevOps' },
  { id: '66666666-6666-4666-8666-666666666666', name: 'Architecture' },
];

const tags = [
  { id: 'tag-nestjs', name: 'nestjs' },
  { id: 'tag-prisma', name: 'prisma' },
  { id: 'tag-docker', name: 'docker' },
  { id: 'tag-postgres', name: 'postgres' },
  { id: 'tag-testing', name: 'testing' },
];

const articles = [
  { id: '77777777-7777-4777-8777-777777777777', title: 'Designing a Stable NestJS API' },
  { id: '88888888-8888-4888-8888-888888888888', title: 'Shipping Services with Docker Compose' },
  { id: '99999999-9999-4999-8999-999999999999', title: 'When to Archive Legacy Endpoints' },
  { id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', title: 'Prisma Query Patterns for CRUD Services' },
  { id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', title: 'Testing Review Flows Before Release' },
];

describe('seedDatabase', () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    mocks.hash.mockResolvedValue('hashed-password');
    mocks.prisma.$disconnect.mockResolvedValue(undefined);
    mocks.prisma.user.upsert
      .mockResolvedValueOnce(users[0])
      .mockResolvedValueOnce(users[1])
      .mockResolvedValueOnce(users[2]);
    mocks.prisma.category.upsert
      .mockResolvedValueOnce(categories[0])
      .mockResolvedValueOnce(categories[1])
      .mockResolvedValueOnce(categories[2]);
    tags.forEach((tag) => {
      mocks.prisma.tag.upsert.mockResolvedValueOnce(tag);
    });
    articles.forEach((article) => {
      mocks.prisma.article.upsert.mockResolvedValueOnce(article);
    });
    mocks.prisma.comment.upsert.mockResolvedValue({});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  it('upserts deterministic seed data without resetting existing records by default', async () => {
    await seedDatabase();

    expect(mocks.hash).toHaveBeenCalledWith('SeedPass123!', 10);
    expect(mocks.prisma.user.deleteMany).not.toHaveBeenCalled();
    expect(mocks.prisma.user.upsert).toHaveBeenCalledTimes(3);
    expect(mocks.prisma.category.upsert).toHaveBeenCalledTimes(3);
    expect(mocks.prisma.tag.upsert).toHaveBeenCalledTimes(5);
    expect(mocks.prisma.article.upsert).toHaveBeenCalledTimes(5);
    expect(mocks.prisma.comment.upsert).toHaveBeenCalledTimes(3);
    expect(mocks.prisma.article.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: '88888888-8888-4888-8888-888888888888' },
      }),
    );
    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining('Sample article id for AI testing: 88888888-8888-4888-8888-888888888888'),
    );
    expect(mocks.prisma.$disconnect).toHaveBeenCalledTimes(1);
  });

  it('clears existing records when reset is requested', async () => {
    await seedDatabase({ reset: true });

    expect(mocks.prisma.comment.deleteMany).toHaveBeenCalledTimes(1);
    expect(mocks.prisma.article.deleteMany).toHaveBeenCalledTimes(1);
    expect(mocks.prisma.category.deleteMany).toHaveBeenCalledTimes(1);
    expect(mocks.prisma.tag.deleteMany).toHaveBeenCalledTimes(1);
    expect(mocks.prisma.refreshSession.deleteMany).toHaveBeenCalledTimes(1);
    expect(mocks.prisma.user.deleteMany).toHaveBeenCalledTimes(1);
    expect(mocks.prisma.$disconnect).toHaveBeenCalledTimes(1);
  });
});
