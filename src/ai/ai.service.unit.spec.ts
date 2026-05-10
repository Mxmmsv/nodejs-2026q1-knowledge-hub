import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ArticleStatus } from '../common/enums/article-status.enum';
import { SummaryLength, ArticleAnalysisTask, ArticleAnalysisSeverity } from './dto';
import { AiService } from './ai.service';

const article = {
  id: '11111111-1111-4111-8111-111111111111',
  title: 'Article',
  content: 'Article content',
  status: ArticleStatus.DRAFT,
  authorId: null,
  categoryId: null,
  tags: ['node'],
  createdAt: 1000,
  updatedAt: 1000,
};

describe('AiService', () => {
  let articleService: {
    getByIdOrThrow: ReturnType<typeof vi.fn>;
  };
  let geminiService: {
    generateContent: ReturnType<typeof vi.fn>;
  };
  let cacheService: {
    createArticleKey: ReturnType<typeof vi.fn>;
    get: ReturnType<typeof vi.fn>;
    set: ReturnType<typeof vi.fn>;
  };
  let usageService: {
    recordCacheHit: ReturnType<typeof vi.fn>;
    recordCacheMiss: ReturnType<typeof vi.fn>;
    recordRequest: ReturnType<typeof vi.fn>;
    getUsage: ReturnType<typeof vi.fn>;
  };
  let conversationMemoryService: {
    getHistory: ReturnType<typeof vi.fn>;
    append: ReturnType<typeof vi.fn>;
  };
  let service: AiService;

  beforeEach(() => {
    articleService = {
      getByIdOrThrow: vi.fn(async () => article),
    };
    geminiService = {
      generateContent: vi.fn(),
    };
    cacheService = {
      createArticleKey: vi.fn(() => 'cache-key'),
      get: vi.fn(),
      set: vi.fn(),
    };
    usageService = {
      recordCacheHit: vi.fn(),
      recordCacheMiss: vi.fn(),
      recordRequest: vi.fn(),
      getUsage: vi.fn(() => ({ totalRequests: 0 })),
    };
    conversationMemoryService = {
      getHistory: vi.fn(() => ({ sessionId: '11111111-1111-4111-8111-111111111111', history: [] })),
      append: vi.fn(),
    };
    service = new AiService(
      articleService as never,
      geminiService as never,
      cacheService as never,
      usageService as never,
      conversationMemoryService as never,
    );
  });

  it('summarizes articles and caches the result', async () => {
    geminiService.generateContent.mockResolvedValue({
      text: 'Summary',
      usage: { promptTokens: 1, completionTokens: 2, totalTokens: 3 },
    });

    await expect(
      service.summarizeArticle(article.id, {
        maxLength: SummaryLength.SHORT,
      }),
    ).resolves.toEqual({
      articleId: article.id,
      summary: 'Summary',
      originalLength: article.content.length,
      summaryLength: 'Summary'.length,
    });

    expect(cacheService.createArticleKey).toHaveBeenCalledWith(
      expect.any(String),
      article,
      expect.objectContaining({ maxLength: SummaryLength.SHORT }),
    );
    expect(usageService.recordCacheMiss).toHaveBeenCalled();
    expect(usageService.recordRequest).toHaveBeenCalledWith(expect.any(String), expect.any(Number), {
      promptTokens: 1,
      completionTokens: 2,
      totalTokens: 3,
    });
    expect(cacheService.set).toHaveBeenCalledWith('cache-key', expect.objectContaining({ summary: 'Summary' }));
  });

  it('returns cached summaries without calling Gemini', async () => {
    cacheService.get.mockReturnValue({ articleId: article.id, summary: 'Cached', originalLength: 1, summaryLength: 6 });

    await expect(service.summarizeArticle(article.id, { maxLength: SummaryLength.MEDIUM })).resolves.toEqual(
      expect.objectContaining({ summary: 'Cached' }),
    );
    expect(geminiService.generateContent).not.toHaveBeenCalled();
    expect(usageService.recordCacheHit).toHaveBeenCalled();
    expect(usageService.recordRequest).toHaveBeenCalledWith(expect.any(String), 0);
  });

  it('translates articles with structured parser fallback', async () => {
    geminiService.generateContent.mockResolvedValue({
      text: '{"translatedText":"Hola","detectedLanguage":"English"}',
    });

    await expect(service.translateArticle(article.id, { targetLanguage: 'Spanish' })).resolves.toEqual({
      articleId: article.id,
      translatedText: 'Hola',
      detectedLanguage: 'English',
    });
  });

  it('analyzes articles without caching', async () => {
    geminiService.generateContent.mockResolvedValue({
      text: '{"analysis":"Review","suggestions":["Improve"],"severity":"warning"}',
    });

    await expect(service.analyzeArticle(article.id, { task: ArticleAnalysisTask.REVIEW })).resolves.toEqual({
      articleId: article.id,
      analysis: 'Review',
      suggestions: ['Improve'],
      severity: ArticleAnalysisSeverity.WARNING,
    });
    expect(cacheService.get).not.toHaveBeenCalled();
  });

  it('generates text with session memory', async () => {
    geminiService.generateContent.mockResolvedValue({ text: 'Answer' });

    await expect(service.generate({ prompt: 'Question' })).resolves.toEqual({
      sessionId: '11111111-1111-4111-8111-111111111111',
      text: 'Answer',
    });
    expect(conversationMemoryService.append).toHaveBeenCalledWith(
      '11111111-1111-4111-8111-111111111111',
      'Question',
      'Answer',
    );
  });
});
