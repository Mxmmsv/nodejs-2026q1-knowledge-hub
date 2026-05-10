import { describe, expect, it } from 'vitest';
import { AiEndpoint } from '../ai.types';
import { AiUsageService } from './ai-usage.service';

describe('AiUsageService', () => {
  it('tracks requests, token usage, latency, and cache metrics', () => {
    const service = new AiUsageService();

    service.recordCacheHit();
    service.recordCacheMiss();
    service.recordRequest(AiEndpoint.SUMMARIZE_ARTICLE, 10, {
      promptTokens: 3,
      completionTokens: 4,
      totalTokens: 7,
    });
    service.recordRequest(AiEndpoint.SUMMARIZE_ARTICLE, 20);

    expect(service.getUsage()).toEqual(
      expect.objectContaining({
        totalRequests: 2,
        requestsByEndpoint: {
          [AiEndpoint.SUMMARIZE_ARTICLE]: 2,
        },
        tokenUsage: {
          promptTokens: 3,
          completionTokens: 4,
          totalTokens: 7,
        },
        latencyMs: {
          count: 2,
          averageMs: 15,
          maxMs: 20,
          lastMs: 20,
        },
        cache: {
          hits: 1,
          misses: 1,
          hitRatio: 0.5,
        },
      }),
    );
  });
});
