import { describe, expect, it } from 'vitest';
import { UserRole } from '../common/enums/user-role.enum';
import {
  getAccessTokenSecret,
  getAccessTokenTtl,
  getAuthRateLimitMax,
  getAuthRateLimitWindowSeconds,
  getBcryptSaltRounds,
  getRefreshTokenSecret,
  getRefreshTokenTtl,
  hashToken,
  isAuthMode,
  isAuthUserPayload,
  isRefreshTokenPayload,
  isTestLogin,
} from './auth.utils';

describe('auth utils', () => {
  it('reads auth mode, test login, and numeric environment values with fallbacks', () => {
    expect(isAuthMode()).toBe(false);
    process.env.TEST_MODE = 'auth';
    expect(isAuthMode()).toBe(true);
    expect(isTestLogin('TEST_user')).toBe(true);
    expect(isTestLogin('user')).toBe(false);

    process.env.CRYPT_SALT = 'invalid';
    process.env.AUTH_RATE_LIMIT_MAX = 'invalid';
    process.env.AUTH_RATE_LIMIT_WINDOW_SECONDS = 'invalid';

    expect(getBcryptSaltRounds()).toBe(10);
    expect(getAuthRateLimitMax()).toBe(30);
    expect(getAuthRateLimitWindowSeconds()).toBe(60);
  });

  it('reads token secrets and ttl values from preferred, legacy, and fallback env vars', () => {
    delete process.env.JWT_SECRET;
    process.env.JWT_SECRET_KEY = 'legacy-access-secret';
    delete process.env.JWT_REFRESH_SECRET;
    process.env.JWT_SECRET_REFRESH_KEY = 'legacy-refresh-secret';
    delete process.env.JWT_ACCESS_TTL;
    process.env.TOKEN_EXPIRE_TIME = '30m';
    delete process.env.JWT_REFRESH_TTL;
    process.env.TOKEN_REFRESH_EXPIRE_TIME = '14d';

    expect(getAccessTokenSecret()).toBe('legacy-access-secret');
    expect(getRefreshTokenSecret()).toBe('legacy-refresh-secret');
    expect(getAccessTokenTtl()).toBe('30m');
    expect(getRefreshTokenTtl()).toBe('14d');

    delete process.env.JWT_SECRET_KEY;
    delete process.env.JWT_SECRET_REFRESH_KEY;
    delete process.env.TOKEN_EXPIRE_TIME;
    delete process.env.TOKEN_REFRESH_EXPIRE_TIME;

    expect(getAccessTokenSecret()).toBe('secret123123');
    expect(getRefreshTokenSecret()).toBe('secret123123');
    expect(getAccessTokenTtl()).toBe('15m');
    expect(getRefreshTokenTtl()).toBe('7d');
  });

  it('validates access and refresh token payload shapes', () => {
    const authUser = {
      userId: 'user-id',
      login: 'user',
      role: UserRole.EDITOR,
    };

    expect(hashToken('token')).toBe(hashToken('token'));
    expect(isAuthUserPayload(null)).toBe(false);
    expect(isAuthUserPayload({ ...authUser, role: 'owner' })).toBe(false);
    expect(isAuthUserPayload(authUser)).toBe(true);
    expect(isRefreshTokenPayload(authUser)).toBe(false);
    expect(isRefreshTokenPayload({ ...authUser, jti: 'session-id' })).toBe(true);
  });
});
