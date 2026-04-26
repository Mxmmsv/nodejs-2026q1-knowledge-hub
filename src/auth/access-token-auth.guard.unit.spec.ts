import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UserRole } from '../common/enums/user-role.enum';
import { AppErrorMessages } from '../common/errors/app-error-messages';
import { UnauthorizedError } from '../common/errors';
import { IS_PUBLIC_KEY } from './public.decorator';
import { AccessTokenAuthGuard } from './access-token-auth.guard';
import { createHttpExecutionContext } from '../../test/unit/mock-execution-context';

describe('AccessTokenAuthGuard', () => {
  let reflector: {
    getAllAndOverride: ReturnType<typeof vi.fn>;
  };
  let jwtService: {
    verifyAsync: ReturnType<typeof vi.fn>;
  };
  let guard: AccessTokenAuthGuard;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: vi.fn(),
    };
    jwtService = {
      verifyAsync: vi.fn(),
    };
    guard = new AccessTokenAuthGuard(reflector as unknown as Reflector, jwtService as unknown as JwtService);
  });

  it('allows all requests when auth mode is disabled', async () => {
    const context = createHttpExecutionContext({ headers: {} });

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(jwtService.verifyAsync).not.toHaveBeenCalled();
  });

  it('allows public routes in auth mode', async () => {
    process.env.TEST_MODE = 'auth';
    reflector.getAllAndOverride.mockImplementation((key: string) => (key === IS_PUBLIC_KEY ? true : undefined));
    const context = createHttpExecutionContext({ headers: {} });

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(jwtService.verifyAsync).not.toHaveBeenCalled();
  });

  it('adds the decoded user to the request for valid bearer tokens', async () => {
    process.env.TEST_MODE = 'auth';
    reflector.getAllAndOverride.mockReturnValue(false);
    const request = {
      headers: {
        authorization: 'Bearer access-token',
      },
    };
    const payload = {
      userId: '11111111-1111-4111-8111-111111111111',
      login: 'user',
      role: UserRole.ADMIN,
    };
    jwtService.verifyAsync.mockResolvedValue(payload);

    await expect(guard.canActivate(createHttpExecutionContext(request))).resolves.toBe(true);

    expect(jwtService.verifyAsync).toHaveBeenCalledWith('access-token', {
      secret: 'unit-access-secret',
    });
    expect(request).toMatchObject({ user: payload });
  });

  it('rejects missing authorization headers', async () => {
    process.env.TEST_MODE = 'auth';
    reflector.getAllAndOverride.mockReturnValue(false);

    await expect(guard.canActivate(createHttpExecutionContext({ headers: {} }))).rejects.toThrow(
      new UnauthorizedError(AppErrorMessages.AUTH_ACCESS_TOKEN_REQUIRED),
    );
  });

  it('rejects malformed bearer headers', async () => {
    process.env.TEST_MODE = 'auth';
    reflector.getAllAndOverride.mockReturnValue(false);

    await expect(
      guard.canActivate(createHttpExecutionContext({ headers: { authorization: 'Token access-token' } })),
    ).rejects.toThrow(new UnauthorizedError(AppErrorMessages.AUTH_BEARER_TOKEN_INVALID));
  });

  it('rejects empty bearer tokens', async () => {
    process.env.TEST_MODE = 'auth';
    reflector.getAllAndOverride.mockReturnValue(false);

    await expect(
      guard.canActivate(createHttpExecutionContext({ headers: { authorization: 'Bearer   ' } })),
    ).rejects.toThrow(new UnauthorizedError(AppErrorMessages.AUTH_ACCESS_TOKEN_REQUIRED));
  });

  it('rejects expired, tampered, or malformed token payloads', async () => {
    process.env.TEST_MODE = 'auth';
    reflector.getAllAndOverride.mockReturnValue(false);
    jwtService.verifyAsync.mockResolvedValue({ userId: 'user-id', login: 'user', role: 'owner' });

    await expect(
      guard.canActivate(createHttpExecutionContext({ headers: { authorization: 'Bearer invalid-token' } })),
    ).rejects.toThrow(new UnauthorizedError(AppErrorMessages.AUTH_ACCESS_TOKEN_INVALID));

    jwtService.verifyAsync.mockRejectedValue(new Error('expired'));

    await expect(
      guard.canActivate(createHttpExecutionContext({ headers: { authorization: 'Bearer expired-token' } })),
    ).rejects.toThrow(new UnauthorizedError(AppErrorMessages.AUTH_ACCESS_TOKEN_INVALID));
  });
});
