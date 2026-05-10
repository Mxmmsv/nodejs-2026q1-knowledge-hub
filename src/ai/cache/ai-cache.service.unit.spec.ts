import { describe, expect, it } from 'vitest';
import { ArticleStatus } from '../../common/enums/article-status.enum';
import { AiEndpoint } from '../ai.types';
import { AiCacheService } from './ai-cache.service';

const article = {
  id: '11111111-1111-4111-8111-111111111111',
  title: 'Article',
  content: 'Content',
  status: ArticleStatus.DRAFT,
  authorId: null,
  categoryId: null,
  tags: [],
  createdAt: 1000,
  updatedAt: 1000,
};

describe('AiCacheService', () => {
  it('stores values until TTL expires', () => {
    process.env.AI_CACHE_TTL_SEC = '1';
    const service = new AiCacheService();

    service.set('key', { value: 'cached' }, 1000);

    expect(service.get('key', 1500)).toEqual({ value: 'cached' });
    expect(service.get('key', 2000)).toBeUndefined();
  });

  it('builds stable keys from endpoint, article version, and sorted params', () => {
    const service = new AiCacheService();

    expect(
      service.createArticleKey(AiEndpoint.TRANSLATE_ARTICLE, article, {
        targetLanguage: 'Spanish',
        sourceLanguage: 'English',
      }),
    ).toBe(
      service.createArticleKey(AiEndpoint.TRANSLATE_ARTICLE, article, {
        sourceLanguage: 'English',
        targetLanguage: 'Spanish',
      }),
    );

    expect(
      service.createArticleKey(AiEndpoint.TRANSLATE_ARTICLE, article, {
        sourceLanguage: 'English',
        targetLanguage: 'French',
      }),
    ).not.toBe(
      service.createArticleKey(AiEndpoint.TRANSLATE_ARTICLE, article, {
        sourceLanguage: 'English',
        targetLanguage: 'Spanish',
      }),
    );
  });
});
