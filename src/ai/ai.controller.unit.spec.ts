import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SummaryLength, ArticleAnalysisTask } from './dto';
import { AiController } from './ai.controller';

describe('AiController', () => {
  let controller: AiController;
  let aiService: {
    summarizeArticle: ReturnType<typeof vi.fn>;
    translateArticle: ReturnType<typeof vi.fn>;
    analyzeArticle: ReturnType<typeof vi.fn>;
    generate: ReturnType<typeof vi.fn>;
    getUsage: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    aiService = {
      summarizeArticle: vi.fn(async () => ({ articleId: 'article-id', summary: 'Summary' })),
      translateArticle: vi.fn(async () => ({ articleId: 'article-id', translatedText: 'Hola' })),
      analyzeArticle: vi.fn(async () => ({ articleId: 'article-id', analysis: 'Review' })),
      generate: vi.fn(async () => ({ sessionId: 'session-id', text: 'Answer' })),
      getUsage: vi.fn(() => ({ totalRequests: 1 })),
    };
    controller = new AiController(aiService as never);
  });

  it('delegates article endpoints to service', async () => {
    await controller.summarizeArticle('article-id', { maxLength: SummaryLength.SHORT });
    await controller.translateArticle('article-id', { targetLanguage: 'Spanish' });
    await controller.analyzeArticle('article-id', { task: ArticleAnalysisTask.BUGS });

    expect(aiService.summarizeArticle).toHaveBeenCalledWith('article-id', { maxLength: SummaryLength.SHORT });
    expect(aiService.translateArticle).toHaveBeenCalledWith('article-id', { targetLanguage: 'Spanish' });
    expect(aiService.analyzeArticle).toHaveBeenCalledWith('article-id', { task: ArticleAnalysisTask.BUGS });
  });

  it('delegates generic generation and usage endpoints', async () => {
    await controller.generate({ prompt: 'Question' });

    expect(aiService.generate).toHaveBeenCalledWith({ prompt: 'Question' });
    expect(controller.getUsage()).toEqual({ totalRequests: 1 });
  });
});
