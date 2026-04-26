import { describe, expect, it } from 'vitest';
import { AuthRateLimitService } from './auth-rate-limit.service';

describe('AuthRateLimitService', () => {
  it('allows requests under the configured limit', () => {
    const service = new AuthRateLimitService();

    expect(service.consume('login:127.0.0.1', 2, 60, 1_000)).toBe(true);
    expect(service.consume('login:127.0.0.1', 2, 60, 2_000)).toBe(true);
  });

  it('rejects requests when the limit is exceeded in the window', () => {
    const service = new AuthRateLimitService();

    service.consume('login:127.0.0.1', 2, 60, 1_000);
    service.consume('login:127.0.0.1', 2, 60, 2_000);

    expect(service.consume('login:127.0.0.1', 2, 60, 3_000)).toBe(false);
  });

  it('expires old attempts and supports reset', () => {
    const service = new AuthRateLimitService();

    service.consume('login:127.0.0.1', 1, 1, 1_000);
    expect(service.consume('login:127.0.0.1', 1, 1, 3_000)).toBe(true);

    expect(service.consume('login:127.0.0.1', 1, 60, 3_100)).toBe(false);
    service.reset();
    expect(service.consume('login:127.0.0.1', 1, 60, 3_200)).toBe(true);
  });
});
