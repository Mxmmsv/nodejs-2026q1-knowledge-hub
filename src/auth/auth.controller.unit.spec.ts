import { Test } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UserRole } from '../common/enums/user-role.enum';
import { AuthRateLimitService } from './auth-rate-limit.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: {
    signup: ReturnType<typeof vi.fn>;
    login: ReturnType<typeof vi.fn>;
    refresh: ReturnType<typeof vi.fn>;
    logout: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    authService = {
      signup: vi.fn(async () => ({
        id: 'user-id',
        login: 'user',
        password: 'hashed-password',
        role: UserRole.VIEWER,
        createdAt: 1000,
        updatedAt: 1000,
      })),
      login: vi.fn(async () => ({ accessToken: 'access-token', refreshToken: 'refresh-token' })),
      refresh: vi.fn(async () => ({ accessToken: 'new-access-token', refreshToken: 'new-refresh-token' })),
      logout: vi.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: authService,
        },
        {
          provide: AuthRateLimitService,
          useValue: {
            consume: vi.fn(() => true),
          },
        },
      ],
    }).compile();

    controller = moduleRef.get(AuthController);
  });

  it('signs users up and strips passwords from responses', async () => {
    const response = await controller.signup({ login: 'user', password: 'secret' });

    expect(authService.signup).toHaveBeenCalledWith({ login: 'user', password: 'secret' });
    expect(response).toEqual({
      id: 'user-id',
      login: 'user',
      role: UserRole.VIEWER,
      createdAt: 1000,
      updatedAt: 1000,
    });
    expect(response).not.toHaveProperty('password');
  });

  it('delegates login, refresh, and logout token flows', async () => {
    await expect(controller.login({ login: 'user', password: 'secret' })).resolves.toEqual({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    });
    await expect(controller.refresh({ refreshToken: 'refresh-token' })).resolves.toEqual({
      accessToken: 'new-access-token',
      refreshToken: 'new-refresh-token',
    });
    await controller.logout({ refreshToken: 'refresh-token' });

    expect(authService.login).toHaveBeenCalledWith('user', 'secret');
    expect(authService.refresh).toHaveBeenCalledWith('refresh-token');
    expect(authService.logout).toHaveBeenCalledWith('refresh-token');
  });

  it('passes undefined refresh tokens through for service-level validation', async () => {
    await controller.refresh();
    await controller.logout();

    expect(authService.refresh).toHaveBeenCalledWith(undefined);
    expect(authService.logout).toHaveBeenCalledWith(undefined);
  });
});
