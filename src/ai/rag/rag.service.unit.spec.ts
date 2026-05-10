import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ArticleStatus } from '../../common/enums/article-status.enum';
import { NotFoundError } from '../../common/errors';
import { AppErrorMessages } from '../../common/errors/app-error-messages';
import { RagService } from './rag.service';

const articleFixture = () => ({
  id: '11111111-1111-4111-8111-111111111111',
  title: 'RAG Article',
  content: 'This article explains retrieval augmented generation.',
  status: ArticleStatus.PUBLISHED,
  authorId: null,
  categoryId: '22222222-2222-4222-8222-222222222222',
  tags: ['rag'],
  createdAt: 1000,
  updatedAt: 2000,
});

describe('RagService', () => {
  let articleService: {
    findAll: ReturnType<typeof vi.fn>;
    getByIdOrThrow: ReturnType<typeof vi.fn>;
  };
  let geminiService: {
    embedContent: ReturnType<typeof vi.fn>;
    generateContent: ReturnType<typeof vi.fn>;
  };
  let chunkerService: {
    chunkArticle: ReturnType<typeof vi.fn>;
  };
  let vectorStoreService: {
    getCollectionName: ReturnType<typeof vi.fn>;
    deleteByArticleId: ReturnType<typeof vi.fn>;
    getArticleChunkHashes: ReturnType<typeof vi.fn>;
    getIndexedArticleIds: ReturnType<typeof vi.fn>;
    upsert: ReturnType<typeof vi.fn>;
    search: ReturnType<typeof vi.fn>;
  };
  let conversationMemoryService: {
    getHistory: ReturnType<typeof vi.fn>;
    getConversation: ReturnType<typeof vi.fn>;
    append: ReturnType<typeof vi.fn>;
    getMaxMessages: ReturnType<typeof vi.fn>;
  };
  let usageService: {
    recordRequest: ReturnType<typeof vi.fn>;
  };
  let service: RagService;

  beforeEach(() => {
    articleService = {
      findAll: vi.fn(async () => [articleFixture()]),
      getByIdOrThrow: vi.fn(async () => articleFixture()),
    };
    geminiService = {
      embedContent: vi.fn(async () => [0.1, 0.2, 0.3]),
      generateContent: vi.fn(async () => ({ text: 'Grounded answer', usage: undefined })),
    };
    chunkerService = {
      chunkArticle: vi.fn(() => [
        {
          articleId: '11111111-1111-4111-8111-111111111111',
          articleTitle: 'RAG Article',
          articleStatus: ArticleStatus.PUBLISHED,
          categoryId: '22222222-2222-4222-8222-222222222222',
          tags: ['rag'],
          articleUpdatedAt: 2000,
          chunk: 'RAG chunk',
          chunkIndex: 0,
          chunkHash: 'hash',
        },
      ]),
    };
    vectorStoreService = {
      getCollectionName: vi.fn(() => 'knowledge_hub_articles'),
      deleteByArticleId: vi.fn(async () => true),
      getArticleChunkHashes: vi.fn(async () => []),
      getIndexedArticleIds: vi.fn(async () => []),
      upsert: vi.fn(),
      search: vi.fn(async () => [
        {
          id: 'point-id',
          score: 0.91234,
          payload: {
            articleId: '11111111-1111-4111-8111-111111111111',
            articleTitle: 'RAG Article',
            articleStatus: ArticleStatus.PUBLISHED,
            categoryId: '22222222-2222-4222-8222-222222222222',
            tags: ['rag'],
            chunk: 'RAG chunk',
            chunkIndex: 0,
            chunkHash: 'hash',
            articleUpdatedAt: 2000,
          },
        },
      ]),
    };
    conversationMemoryService = {
      getHistory: vi.fn(() => ({ conversationId: '33333333-3333-4333-8333-333333333333', history: [] })),
      getConversation: vi.fn(() => [{ role: 'user', content: 'Question' }]),
      append: vi.fn(),
      getMaxMessages: vi.fn(() => 20),
    };
    usageService = {
      recordRequest: vi.fn(),
    };
    service = new RagService(
      articleService as never,
      geminiService as never,
      chunkerService as never,
      vectorStoreService as never,
      conversationMemoryService as never,
      usageService as never,
    );
  });

  it('reindexes published articles into vector points', async () => {
    await expect(service.reindex({})).resolves.toEqual({
      indexedArticles: 1,
      indexedChunks: 1,
      vectorCollection: 'knowledge_hub_articles',
    });

    expect(articleService.findAll).toHaveBeenCalledWith({ status: ArticleStatus.PUBLISHED });
    expect(geminiService.embedContent).toHaveBeenCalledWith('RAG chunk', 'RETRIEVAL_DOCUMENT');
    expect(vectorStoreService.upsert).toHaveBeenCalledWith([
      expect.objectContaining({
        id: expect.any(String),
        vector: [0.1, 0.2, 0.3],
        payload: expect.objectContaining({
          articleId: '11111111-1111-4111-8111-111111111111',
          chunk: 'RAG chunk',
        }),
      }),
    ]);
  });

  it('skips unchanged articles during incremental reindexing', async () => {
    vectorStoreService.getArticleChunkHashes.mockResolvedValueOnce(['hash']);

    await expect(service.reindex({})).resolves.toEqual({
      indexedArticles: 0,
      indexedChunks: 0,
      vectorCollection: 'knowledge_hub_articles',
    });

    expect(geminiService.embedContent).not.toHaveBeenCalled();
    expect(vectorStoreService.upsert).not.toHaveBeenCalled();
  });

  it('removes stale indexed articles during full reindexing', async () => {
    vectorStoreService.getIndexedArticleIds.mockResolvedValueOnce(['stale-article-id']);

    await service.reindex({});

    expect(vectorStoreService.deleteByArticleId).toHaveBeenCalledWith('stale-article-id');
  });

  it('runs semantic search with metadata filters', async () => {
    await expect(
      service.search({
        query: 'What is RAG?',
        limit: 5,
        articleStatus: ArticleStatus.PUBLISHED,
        tags: ['rag'],
      }),
    ).resolves.toEqual({
      results: [
        {
          articleId: '11111111-1111-4111-8111-111111111111',
          articleTitle: 'RAG Article',
          chunk: 'RAG chunk',
          similarity: expect.any(Number),
        },
      ],
    });

    expect(geminiService.embedContent).toHaveBeenCalledWith('What is RAG?', 'RETRIEVAL_QUERY');
    expect(vectorStoreService.search).toHaveBeenCalledWith([0.1, 0.2, 0.3], 20, {
      articleStatus: ArticleStatus.PUBLISHED,
      categoryId: undefined,
      tags: ['rag'],
    });
  });

  it('merges lexical candidates with semantic search results and reranks them', async () => {
    articleService.findAll.mockResolvedValueOnce([
      articleFixture(),
      {
        ...articleFixture(),
        id: '99999999-9999-4999-8999-999999999999',
        title: 'Docker Compose Runtime',
        content: 'Docker Compose health checks and migrations keep services repeatable.',
        tags: ['docker'],
      },
    ]);
    chunkerService.chunkArticle.mockImplementation((article) => [
      {
        articleId: article.id,
        articleTitle: article.title,
        articleStatus: article.status,
        categoryId: article.categoryId,
        tags: article.tags,
        articleUpdatedAt: article.updatedAt,
        chunk: article.content,
        chunkIndex: 0,
        chunkHash: `${article.id}:hash`,
      },
    ]);
    vectorStoreService.search.mockResolvedValueOnce([
      {
        id: 'semantic-id',
        score: 0.2,
        payload: {
          articleId: '11111111-1111-4111-8111-111111111111',
          articleTitle: 'RAG Article',
          articleStatus: ArticleStatus.PUBLISHED,
          categoryId: '22222222-2222-4222-8222-222222222222',
          tags: ['rag'],
          chunk: 'Generic retrieval text',
          chunkIndex: 0,
          chunkHash: 'semantic-hash',
          articleUpdatedAt: 2000,
        },
      },
    ]);

    await expect(service.search({ query: 'Docker Compose health checks', limit: 1 })).resolves.toEqual({
      results: [
        expect.objectContaining({
          articleId: '99999999-9999-4999-8999-999999999999',
          articleTitle: 'Docker Compose Runtime',
        }),
      ],
    });
  });

  it('generates grounded chat answers with returned sources', async () => {
    await expect(service.chat({ question: 'Explain RAG' })).resolves.toEqual({
      answer: 'Grounded answer',
      conversationId: '33333333-3333-4333-8333-333333333333',
      sources: [
        {
          articleId: '11111111-1111-4111-8111-111111111111',
          articleTitle: 'RAG Article',
          relevantChunk: 'RAG chunk',
        },
      ],
    });

    expect(geminiService.generateContent).toHaveBeenCalledWith(expect.stringContaining('RAG chunk'));
    expect(conversationMemoryService.append).toHaveBeenCalledWith(
      '33333333-3333-4333-8333-333333333333',
      'Explain RAG',
      'Grounded answer',
    );
  });

  it('returns a controlled answer when no RAG sources are found', async () => {
    vectorStoreService.search.mockResolvedValueOnce([]);

    await expect(service.chat({ question: 'Unknown' })).resolves.toEqual({
      answer: 'Knowledge Hub sources do not contain enough information to answer this question.',
      conversationId: '33333333-3333-4333-8333-333333333333',
      sources: [],
    });

    expect(geminiService.generateContent).not.toHaveBeenCalled();
  });

  it('throws not found when deleting missing article vectors', async () => {
    vectorStoreService.deleteByArticleId.mockResolvedValueOnce(false);

    await expect(service.deleteArticleIndex('article-id')).rejects.toThrow(
      new NotFoundError(AppErrorMessages.RAG_INDEX_ENTRY_NOT_FOUND),
    );
  });

  it('returns conversation history or not found', () => {
    expect(service.getHistory('33333333-3333-4333-8333-333333333333')).toEqual({
      conversationId: '33333333-3333-4333-8333-333333333333',
      messages: [{ role: 'user', content: 'Question' }],
      maxMessages: 20,
    });

    conversationMemoryService.getConversation.mockReturnValueOnce(undefined);

    expect(() => service.getHistory('44444444-4444-4444-8444-444444444444')).toThrow(
      new NotFoundError(AppErrorMessages.RAG_CONVERSATION_NOT_FOUND),
    );
  });
});
