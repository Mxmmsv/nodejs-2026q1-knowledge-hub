import { HttpException, HttpStatus } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthUser } from '../../auth/auth.types';
import { UserRole } from '../../common/enums/user-role.enum';
import { AppErrorMessages } from '../../common/errors/app-error-messages';
import { createHttpExecutionContext } from '../../../test/unit/mock-execution-context';
import { AiRateLimitGuard } from './ai-rate-limit.guard';
import { AiRateLimitService } from './ai-rate-limit.service';

const authUser: AuthUser = {
  userId: 'user-id',
  login: 'user',
  role: UserRole.EDITOR,
};

describe('AiRateLimitGuard', () => {
  let rateLimitService: {
    consume: ReturnType<typeof vi.fn>;
  };
  let guard: AiRateLimitGuard;
  let response: {
    setHeader: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    rateLimitService = {
      consume: vi.fn(),
    };
    response = {
      setHeader: vi.fn(),
    };
    guard = new AiRateLimitGuard(rateLimitService as unknown as AiRateLimitService);
  });

  it('uses current user identity when available', () => {
    rateLimitService.consume.mockReturnValue({ isAllowed: true, retryAfterSeconds: 0 });

    expect(
      guard.canActivate(
        createHttpExecutionContext(
          {
            route: { path: '/ai/generate' },
            path: '/fallback',
            ip: '127.0.0.1',
            headers: {},
            user: authUser,
          },
          response,
        ),
      ),
    ).toBe(true);

    expect(rateLimitService.consume).toHaveBeenCalledWith('/ai/generate:user-id', 20, 60);
  });

  it('uses forwarded IP and sets Retry-After when denied', () => {
    rateLimitService.consume.mockReturnValue({ isAllowed: false, retryAfterSeconds: 17 });

    expect(() =>
      guard.canActivate(
        createHttpExecutionContext(
          {
            path: '/ai/generate',
            ip: '10.0.0.2',
            headers: {
              'x-forwarded-for': '203.0.113.10, 10.0.0.2',
            },
          },
          response,
        ),
      ),
    ).toThrow(new HttpException(AppErrorMessages.AI_RATE_LIMIT_EXCEEDED, HttpStatus.TOO_MANY_REQUESTS));
    expect(rateLimitService.consume).toHaveBeenCalledWith('/ai/generate:203.0.113.10', 20, 60);
    expect(response.setHeader).toHaveBeenCalledWith('Retry-After', '17');
  });
});
