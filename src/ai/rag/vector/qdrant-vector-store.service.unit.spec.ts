import { HttpException, HttpStatus } from '@nestjs/common';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ArticleStatus } from '../../../common/enums/article-status.enum';
import { AppErrorMessages } from '../../../common/errors/app-error-messages';
import { QdrantVectorStoreService } from './qdrant-vector-store.service';

const createFetchResponse = (status: number, body: Record<string, unknown> = {}) =>
  ({
    ok: status >= 200 && status < 300,
    status,
    text: vi.fn(async () => JSON.stringify(body)),
  }) as unknown as Response;

describe('QdrantVectorStoreService', () => {
  let service: QdrantVectorStoreService;
  let logger: {
    warn: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    process.env.RAG_VECTOR_DB_URL = 'http://qdrant:6333';
    process.env.RAG_VECTOR_COLLECTION = 'test_collection';
    logger = {
      warn: vi.fn(),
    };
    service = new QdrantVectorStoreService(logger as never);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.RAG_VECTOR_DB_URL;
    delete process.env.RAG_VECTOR_COLLECTION;
  });

  it('creates a missing collection before upserting points', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(createFetchResponse(404))
      .mockResolvedValueOnce(createFetchResponse(200))
      .mockResolvedValueOnce(createFetchResponse(200));
    vi.stubGlobal('fetch', fetchMock);

    await service.upsert([
      {
        id: 'point-id',
        vector: [0.1, 0.2],
        payload: {
          articleId: 'article-id',
          articleTitle: 'Article',
          articleStatus: ArticleStatus.PUBLISHED,
          categoryId: null,
          tags: ['node'],
          chunk: 'Chunk',
          chunkIndex: 0,
          chunkHash: 'hash',
          articleUpdatedAt: 1000,
        },
      },
    ]);

    expect(fetchMock).toHaveBeenNthCalledWith(2, 'http://qdrant:6333/collections/test_collection', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        vectors: {
          size: 2,
          distance: 'Cosine',
        },
      }),
    });
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      'http://qdrant:6333/collections/test_collection/points?wait=true',
      expect.objectContaining({ method: 'PUT' }),
    );
  });

  it('maps metadata filters into Qdrant search filters', async () => {
    const fetchMock = vi.fn(async () =>
      createFetchResponse(200, {
        result: [
          {
            id: 'point-id',
            score: 0.91,
            payload: {
              articleId: 'article-id',
              articleTitle: 'Article',
              articleStatus: ArticleStatus.PUBLISHED,
              categoryId: '11111111-1111-4111-8111-111111111111',
              tags: ['node'],
              chunk: 'Chunk',
              chunkIndex: 0,
              chunkHash: 'hash',
              articleUpdatedAt: 1000,
            },
          },
        ],
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      service.search([0.1, 0.2], 5, {
        articleStatus: ArticleStatus.PUBLISHED,
        categoryId: '11111111-1111-4111-8111-111111111111',
        tags: ['node'],
      }),
    ).resolves.toHaveLength(1);

    expect(fetchMock).toHaveBeenCalledWith(
      'http://qdrant:6333/collections/test_collection/points/search',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          vector: [0.1, 0.2],
          limit: 5,
          with_payload: true,
          filter: {
            must: [
              { key: 'articleStatus', match: { value: ArticleStatus.PUBLISHED } },
              { key: 'categoryId', match: { value: '11111111-1111-4111-8111-111111111111' } },
              { key: 'tags', match: { value: 'node' } },
            ],
          },
        }),
      }),
    );
  });

  it('returns false when deleting article points from a missing collection', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => createFetchResponse(404)),
    );

    await expect(service.deleteByArticleId('article-id')).resolves.toBe(false);
  });

  it('reads indexed article ids through Qdrant scroll', async () => {
    const fetchMock = vi.fn(async () =>
      createFetchResponse(200, {
        result: {
          points: [
            { id: '1', payload: { articleId: 'article-a' } },
            { id: '2', payload: { articleId: 'article-b' } },
            { id: '3', payload: { articleId: 'article-a' } },
          ],
        },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(service.getIndexedArticleIds()).resolves.toEqual(['article-a', 'article-b']);

    expect(fetchMock).toHaveBeenCalledWith(
      'http://qdrant:6333/collections/test_collection/points/scroll',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          limit: 256,
          with_payload: true,
          with_vector: false,
        }),
      }),
    );
  });

  it('reads indexed chunk hashes for an article through Qdrant scroll', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        createFetchResponse(200, {
          result: {
            points: [
              { id: '1', payload: { articleId: 'article-id', chunkHash: 'hash-b' } },
              { id: '2', payload: { articleId: 'article-id', chunkHash: 'hash-a' } },
            ],
          },
        }),
      ),
    );

    await expect(service.getArticleChunkHashes('article-id')).resolves.toEqual(['hash-a', 'hash-b']);
  });

  it('maps Qdrant network failures to service unavailable', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Promise.reject(new Error('offline'))),
    );

    await expect(service.search([0.1], 5)).rejects.toThrow(
      new HttpException(AppErrorMessages.VECTOR_DATABASE_UNAVAILABLE, HttpStatus.SERVICE_UNAVAILABLE),
    );
  });
});
