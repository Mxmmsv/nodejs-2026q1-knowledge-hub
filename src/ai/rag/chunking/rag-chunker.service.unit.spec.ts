import { afterEach, describe, expect, it } from 'vitest';
import { ArticleStatus } from '../../../common/enums/article-status.enum';
import { RagChunkerService } from './rag-chunker.service';

const articleFixture = (content: string) => ({
  id: '11111111-1111-4111-8111-111111111111',
  title: 'Node.js Guide',
  content,
  status: ArticleStatus.PUBLISHED,
  authorId: null,
  categoryId: '22222222-2222-4222-8222-222222222222',
  tags: ['node', 'api'],
  createdAt: 1000,
  updatedAt: 2000,
});

describe('RagChunkerService', () => {
  afterEach(() => {
    delete process.env.RAG_CHUNK_SIZE;
    delete process.env.RAG_CHUNK_OVERLAP;
  });

  it('creates deterministic chunks with metadata and stable hashes', () => {
    process.env.RAG_CHUNK_SIZE = '220';
    process.env.RAG_CHUNK_OVERLAP = '10';

    const service = new RagChunkerService();
    const firstRun = service.chunkArticle(articleFixture('A '.repeat(80)));
    const secondRun = service.chunkArticle(articleFixture('A '.repeat(80)));

    expect(firstRun).toEqual(secondRun);
    expect(firstRun.length).toBeGreaterThan(1);
    expect(firstRun[0]).toEqual(
      expect.objectContaining({
        articleId: '11111111-1111-4111-8111-111111111111',
        articleTitle: 'Node.js Guide',
        articleStatus: ArticleStatus.PUBLISHED,
        categoryId: '22222222-2222-4222-8222-222222222222',
        tags: ['node', 'api'],
        articleUpdatedAt: 2000,
        chunkIndex: 0,
        chunkHash: expect.any(String),
      }),
    );
    expect(firstRun[0].chunk).toContain('Category: 22222222-2222-4222-8222-222222222222');
  });

  it('handles overlap values larger than chunk size without looping forever', () => {
    process.env.RAG_CHUNK_SIZE = '30';
    process.env.RAG_CHUNK_OVERLAP = '300';

    const chunks = new RagChunkerService().chunkArticle(articleFixture('B '.repeat(20)));

    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks.length).toBeLessThan(100);
  });
});
