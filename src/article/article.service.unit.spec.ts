import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { ArticleStatus } from '../common/enums/article-status.enum';
import { AppErrorMessages } from '../common/errors/app-error-messages';
import { Article } from './models/article.model';
import { ArticleRepository } from './repositories/article.repository';
import { InMemoryArticleRepository } from './repositories/in-memory-article.repository';
import { ArticleService } from './article.service';

const articleFixture = (overrides: Partial<Article> = {}): Article => ({
  id: '11111111-1111-4111-8111-111111111111',
  title: 'Article',
  content: 'Content',
  status: ArticleStatus.DRAFT,
  authorId: null,
  categoryId: null,
  tags: [],
  createdAt: 1000,
  updatedAt: 1000,
  ...overrides,
});

describe('ArticleService', () => {
  let service: ArticleService;
  let articleRepository: {
    findAll: ReturnType<typeof vi.fn>;
    findById: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
    remove: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    articleRepository = {
      findAll: vi.fn(),
      findById: vi.fn(),
      save: vi.fn(async (article: Article) => article),
      remove: vi.fn(async () => true),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        ArticleService,
        {
          provide: ArticleRepository,
          useValue: articleRepository,
        },
      ],
    }).compile();

    service = moduleRef.get(ArticleService);
  });

  it('creates draft articles with nullable relations and empty tags by default', async () => {
    const article = await service.create({
      title: 'Intro',
      content: 'Text',
    });

    expect(articleRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Intro',
        content: 'Text',
        status: ArticleStatus.DRAFT,
        authorId: null,
        categoryId: null,
        tags: [],
      }),
    );
    expect(article.id).toEqual(expect.any(String));
    expect(article.createdAt).toEqual(expect.any(Number));
    expect(article.updatedAt).toEqual(expect.any(Number));
  });

  it('preserves explicitly provided status, tags, author, and category on create', async () => {
    const authorId = '11111111-1111-4111-8111-111111111111';
    const categoryId = '22222222-2222-4222-8222-222222222222';

    await service.create({
      title: 'Published',
      content: 'Text',
      status: ArticleStatus.PUBLISHED,
      authorId,
      categoryId,
      tags: ['node', 'nestjs'],
    });

    expect(articleRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        status: ArticleStatus.PUBLISHED,
        authorId,
        categoryId,
        tags: ['node', 'nestjs'],
      }),
    );
  });

  it('delegates filters to the repository', async () => {
    const filters = {
      status: ArticleStatus.PUBLISHED,
      categoryId: '22222222-2222-4222-8222-222222222222',
      tag: 'node',
    };
    articleRepository.findAll.mockResolvedValue([articleFixture()]);

    await expect(service.findAll(filters)).resolves.toEqual([articleFixture()]);

    expect(articleRepository.findAll).toHaveBeenCalledWith(filters);
  });

  it('throws NotFoundException when an article does not exist', async () => {
    articleRepository.findById.mockResolvedValue(undefined);

    await expect(service.getByIdOrThrow('missing')).rejects.toThrow(
      new NotFoundException(AppErrorMessages.ARTICLE_NOT_FOUND),
    );
  });

  it('updates mutable fields and preserves category and tags when omitted', async () => {
    const existing = articleFixture({
      categoryId: '22222222-2222-4222-8222-222222222222',
      tags: ['old'],
    });
    articleRepository.findById.mockResolvedValue(existing);

    await service.update(existing.id, {
      title: 'Updated',
      content: 'Updated content',
    });

    expect(articleRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: existing.id,
        title: 'Updated',
        content: 'Updated content',
        categoryId: existing.categoryId,
        tags: ['old'],
      }),
    );
  });

  it('replaces tags and allows category nulling when values are provided', async () => {
    const existing = articleFixture({
      categoryId: '22222222-2222-4222-8222-222222222222',
      tags: ['old'],
    });
    articleRepository.findById.mockResolvedValue(existing);

    await service.update(existing.id, {
      categoryId: null,
      tags: ['new'],
    });

    expect(articleRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        categoryId: null,
        tags: ['new'],
      }),
    );
  });

  it.each([
    [ArticleStatus.DRAFT, ArticleStatus.PUBLISHED],
    [ArticleStatus.PUBLISHED, ArticleStatus.ARCHIVED],
    [ArticleStatus.ARCHIVED, ArticleStatus.ARCHIVED],
  ])('allows valid status transition %s -> %s', async (currentStatus, nextStatus) => {
    const existing = articleFixture({ status: currentStatus });
    articleRepository.findById.mockResolvedValue(existing);

    await service.update(existing.id, { status: nextStatus });

    expect(articleRepository.save).toHaveBeenCalledWith(expect.objectContaining({ status: nextStatus }));
  });

  it.each([
    [ArticleStatus.DRAFT, ArticleStatus.ARCHIVED],
    [ArticleStatus.PUBLISHED, ArticleStatus.DRAFT],
    [ArticleStatus.ARCHIVED, ArticleStatus.PUBLISHED],
    [ArticleStatus.ARCHIVED, ArticleStatus.DRAFT],
  ])('rejects invalid status transition %s -> %s', async (currentStatus, nextStatus) => {
    const existing = articleFixture({ status: currentStatus });
    articleRepository.findById.mockResolvedValue(existing);

    await expect(service.update(existing.id, { status: nextStatus })).rejects.toThrow(
      new BadRequestException(AppErrorMessages.ARTICLE_STATUS_TRANSITION_INVALID),
    );
    expect(articleRepository.save).not.toHaveBeenCalled();
  });

  it('checks existence before deleting', async () => {
    const existing = articleFixture();
    articleRepository.findById.mockResolvedValue(existing);

    await service.delete(existing.id);

    expect(articleRepository.remove).toHaveBeenCalledWith(existing.id);
  });
});

describe('InMemoryArticleRepository', () => {
  it('filters articles by status, categoryId, and tag', async () => {
    const repository = new InMemoryArticleRepository();
    const categoryId = '22222222-2222-4222-8222-222222222222';
    const matchingArticle = articleFixture({
      id: '11111111-1111-4111-8111-111111111111',
      status: ArticleStatus.PUBLISHED,
      categoryId,
      tags: ['node'],
    });
    const wrongStatusArticle = articleFixture({
      id: '33333333-3333-4333-8333-333333333333',
      status: ArticleStatus.DRAFT,
      categoryId,
      tags: ['node'],
    });
    const wrongTagArticle = articleFixture({
      id: '44444444-4444-4444-8444-444444444444',
      status: ArticleStatus.PUBLISHED,
      categoryId,
      tags: ['api'],
    });

    await repository.save(matchingArticle);
    await repository.save(wrongStatusArticle);
    await repository.save(wrongTagArticle);

    await expect(
      repository.findAll({
        status: ArticleStatus.PUBLISHED,
        categoryId,
        tag: 'node',
      }),
    ).resolves.toEqual([matchingArticle]);
  });
});
