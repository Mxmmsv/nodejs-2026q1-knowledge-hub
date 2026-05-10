import { describe, expect, it } from 'vitest';
import { AiRateLimitService } from './ai-rate-limit.service';

describe('AiRateLimitService', () => {
  it('allows requests under the limit and returns retry delay when exceeded', () => {
    const service = new AiRateLimitService();

    expect(service.consume('key', 2, 60, 1000)).toEqual({ isAllowed: true, retryAfterSeconds: 0 });
    expect(service.consume('key', 2, 60, 2000)).toEqual({ isAllowed: true, retryAfterSeconds: 0 });
    expect(service.consume('key', 2, 60, 3000)).toEqual({ isAllowed: false, retryAfterSeconds: 58 });
    expect(service.consume('key', 2, 60, 62_000)).toEqual({ isAllowed: true, retryAfterSeconds: 0 });
  });
});
