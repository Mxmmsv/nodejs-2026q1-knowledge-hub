import { HttpException, HttpStatus } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppErrorMessages } from '../common/errors/app-error-messages';
import { createHttpExecutionContext } from '../../test/unit/mock-execution-context';
import { AuthRateLimitService } from './auth-rate-limit.service';
import { AuthRateLimitGuard } from './auth-rate-limit.guard';

describe('AuthRateLimitGuard', () => {
  let rateLimitService: {
    consume: ReturnType<typeof vi.fn>;
  };
  let guard: AuthRateLimitGuard;

  beforeEach(() => {
    rateLimitService = {
      consume: vi.fn(),
    };
    guard = new AuthRateLimitGuard(rateLimitService as unknown as AuthRateLimitService);
  });

  it('allows requests under the limit and uses the forwarded IP', () => {
    rateLimitService.consume.mockReturnValue(true);

    expect(
      guard.canActivate(
        createHttpExecutionContext({
          route: { path: '/auth/login' },
          path: '/fallback',
          ip: '10.0.0.2',
          headers: {
            'x-forwarded-for': '203.0.113.10, 10.0.0.2',
          },
        }),
      ),
    ).toBe(true);

    expect(rateLimitService.consume).toHaveBeenCalledWith('/auth/login:203.0.113.10', 3, 60);
  });

  it('throws 429 when the request exceeds the limit', () => {
    rateLimitService.consume.mockReturnValue(false);

    expect(() =>
      guard.canActivate(
        createHttpExecutionContext({
          path: '/auth/signup',
          ip: '127.0.0.1',
          headers: {},
        }),
      ),
    ).toThrow(new HttpException(AppErrorMessages.AUTH_RATE_LIMIT_EXCEEDED, HttpStatus.TOO_MANY_REQUESTS));
  });
});
