import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { UserRole as PrismaUserRole } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UserRole } from '../common/enums/user-role.enum';
import { AppErrorMessages } from '../common/errors/app-error-messages';
import { ForbiddenError, UnauthorizedError } from '../common/errors';
import { PrismaService } from '../prisma/prisma.service';
import { UserService } from '../user/user.service';
import { hashPassword, hashToken } from './auth.utils';
import { AuthService } from './auth.service';

const prismaUserFixture = (overrides: Record<string, unknown> = {}) => ({
  id: '11111111-1111-4111-8111-111111111111',
  login: 'user',
  password: 'hashed',
  role: PrismaUserRole.VIEWER,
  createdAt: new Date(1000),
  updatedAt: new Date(1000),
  ...overrides,
});

describe('AuthService', () => {
  let service: AuthService;
  let jwtService: {
    signAsync: ReturnType<typeof vi.fn>;
    verifyAsync: ReturnType<typeof vi.fn>;
    decode: ReturnType<typeof vi.fn>;
  };
  let prisma: {
    user: {
      findUnique: ReturnType<typeof vi.fn>;
      deleteMany: ReturnType<typeof vi.fn>;
    };
    refreshSession: {
      findUnique: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
    };
    $transaction: ReturnType<typeof vi.fn>;
  };
  let userService: {
    create: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    jwtService = {
      signAsync: vi.fn(),
      verifyAsync: vi.fn(),
      decode: vi.fn(() => ({ exp: 2_000_000_000 })),
    };
    prisma = {
      user: {
        findUnique: vi.fn(),
        deleteMany: vi.fn(),
      },
      refreshSession: {
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      $transaction: vi.fn(),
    };
    userService = {
      create: vi.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: JwtService,
          useValue: jwtService,
        },
        {
          provide: PrismaService,
          useValue: prisma,
        },
        {
          provide: UserService,
          useValue: userService,
        },
      ],
    }).compile();

    service = moduleRef.get(AuthService);
  });

  it('delegates signup and removes repeated test users in auth mode', async () => {
    process.env.TEST_MODE = 'auth';
    userService.create.mockResolvedValue({ id: 'user-id' });

    await service.signup({ login: 'TEST_user', password: 'secret' });

    expect(prisma.user.deleteMany).toHaveBeenCalledWith({ where: { login: 'TEST_user' } });
    expect(userService.create).toHaveBeenCalledWith({ login: 'TEST_user', password: 'secret' });
  });

  it('rejects invalid login credentials', async () => {
    prisma.user.findUnique.mockResolvedValue(undefined);

    await expect(service.login('missing', 'secret')).rejects.toThrow(
      new ForbiddenError(AppErrorMessages.AUTH_INVALID_CREDENTIALS),
    );
  });

  it('issues access and refresh tokens and stores hashed refresh sessions on login', async () => {
    prisma.user.findUnique.mockResolvedValue(prismaUserFixture({ password: await hashPassword('secret') }));
    jwtService.signAsync.mockResolvedValueOnce('access-token').mockResolvedValueOnce('refresh-token');

    await expect(service.login('user', 'secret')).resolves.toEqual({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    });

    expect(jwtService.signAsync).toHaveBeenNthCalledWith(
      1,
      {
        userId: '11111111-1111-4111-8111-111111111111',
        login: 'user',
        role: UserRole.VIEWER,
      },
      expect.objectContaining({ secret: 'unit-access-secret' }),
    );
    expect(prisma.refreshSession.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        id: expect.any(String),
        userId: '11111111-1111-4111-8111-111111111111',
        tokenHash: hashToken('refresh-token'),
        expiresAt: new Date(2_000_000_000_000),
      }),
    });
  });

  it('rejects missing refresh tokens', async () => {
    await expect(service.refresh(undefined)).rejects.toThrow(
      new UnauthorizedError(AppErrorMessages.AUTH_REFRESH_TOKEN_REQUIRED),
    );
  });

  it('rejects tampered or expired refresh tokens', async () => {
    jwtService.verifyAsync.mockRejectedValue(new Error('bad token'));

    await expect(service.refresh('tampered-token')).rejects.toThrow(
      new ForbiddenError(AppErrorMessages.AUTH_REFRESH_TOKEN_INVALID),
    );
  });

  it.each([
    [{ revokedAt: new Date(), expiresAt: new Date(Date.now() + 10_000), tokenHash: hashToken('refresh-token') }],
    [{ revokedAt: null, expiresAt: new Date(Date.now() - 10_000), tokenHash: hashToken('refresh-token') }],
    [{ revokedAt: null, expiresAt: new Date(Date.now() + 10_000), tokenHash: hashToken('different-token') }],
  ])('rejects invalid refresh session state %#', async (sessionOverrides) => {
    jwtService.verifyAsync.mockResolvedValue({
      userId: '11111111-1111-4111-8111-111111111111',
      login: 'user',
      role: UserRole.VIEWER,
      jti: 'session-id',
    });
    prisma.refreshSession.findUnique.mockResolvedValue({
      id: 'session-id',
      userId: '11111111-1111-4111-8111-111111111111',
      ...sessionOverrides,
    });

    await expect(service.refresh('refresh-token')).rejects.toThrow(
      new ForbiddenError(AppErrorMessages.AUTH_REFRESH_TOKEN_INVALID),
    );
  });

  it('rotates refresh tokens inside a transaction', async () => {
    jwtService.verifyAsync.mockResolvedValue({
      userId: '11111111-1111-4111-8111-111111111111',
      login: 'user',
      role: UserRole.VIEWER,
      jti: 'old-session-id',
    });
    prisma.refreshSession.findUnique.mockResolvedValue({
      id: 'old-session-id',
      userId: '11111111-1111-4111-8111-111111111111',
      revokedAt: null,
      expiresAt: new Date(Date.now() + 10_000),
      tokenHash: hashToken('refresh-token'),
    });
    prisma.user.findUnique.mockResolvedValue(prismaUserFixture());
    jwtService.signAsync.mockResolvedValueOnce('new-access-token').mockResolvedValueOnce('new-refresh-token');
    const tx = {
      refreshSession: {
        update: vi.fn(),
        create: vi.fn(),
      },
    };
    prisma.$transaction.mockImplementation(async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx));

    await expect(service.refresh('refresh-token')).resolves.toEqual({
      accessToken: 'new-access-token',
      refreshToken: 'new-refresh-token',
    });

    expect(tx.refreshSession.update).toHaveBeenCalledWith({
      where: { id: 'old-session-id' },
      data: { revokedAt: expect.any(Date) },
    });
    expect(tx.refreshSession.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tokenHash: hashToken('new-refresh-token'),
      }),
    });
  });

  it('logs out by revoking a valid refresh session', async () => {
    jwtService.verifyAsync.mockResolvedValue({
      userId: '11111111-1111-4111-8111-111111111111',
      login: 'user',
      role: UserRole.VIEWER,
      jti: 'session-id',
    });
    prisma.refreshSession.findUnique.mockResolvedValue({
      id: 'session-id',
      userId: '11111111-1111-4111-8111-111111111111',
      revokedAt: null,
      expiresAt: new Date(Date.now() + 10_000),
      tokenHash: hashToken('refresh-token'),
    });

    await service.logout('refresh-token');

    expect(prisma.refreshSession.update).toHaveBeenCalledWith({
      where: { id: 'session-id' },
      data: { revokedAt: expect.any(Date) },
    });
  });
});
