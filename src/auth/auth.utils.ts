import * as bcrypt from 'bcrypt';
import { createHash } from 'crypto';
import { UserRole } from '../common/enums/user-role.enum';
import { AuthUser, RefreshTokenPayload } from './auth.types';

const parseInteger = (value: string | undefined, fallback: number): number => {
  const parsedValue = Number.parseInt(value ?? '', 10);

  return Number.isNaN(parsedValue) ? fallback : parsedValue;
};

const getEnvValue = (keys: string[], fallback: string): string => {
  for (const key of keys) {
    const value = process.env[key];

    if (value) {
      return value;
    }
  }

  return fallback;
};

export const isAuthMode = (): boolean => process.env.TEST_MODE === 'auth';

export const isTestLogin = (login: string): boolean => login.startsWith('TEST_');

export const getBcryptSaltRounds = (): number => parseInteger(process.env.CRYPT_SALT, 10);

export const getAccessTokenSecret = (): string => getEnvValue(['JWT_SECRET', 'JWT_SECRET_KEY'], 'secret123123');

export const getRefreshTokenSecret = (): string =>
  getEnvValue(['JWT_REFRESH_SECRET', 'JWT_SECRET_REFRESH_KEY'], 'secret123123');

export const getAccessTokenTtl = (): string => getEnvValue(['JWT_ACCESS_TTL', 'TOKEN_EXPIRE_TIME'], '15m');

export const getRefreshTokenTtl = (): string => getEnvValue(['JWT_REFRESH_TTL', 'TOKEN_REFRESH_EXPIRE_TIME'], '7d');

export const getAuthRateLimitMax = (): number => parseInteger(process.env.AUTH_RATE_LIMIT_MAX, 30);

export const getAuthRateLimitWindowSeconds = (): number => parseInteger(process.env.AUTH_RATE_LIMIT_WINDOW_SECONDS, 60);

export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, getBcryptSaltRounds());
};

export const isPasswordMatch = async (rawPassword: string, storedPassword: string): Promise<boolean> => {
  return bcrypt.compare(rawPassword, storedPassword);
};

export const hashToken = (token: string): string => createHash('sha256').update(token).digest('hex');

const isUserRole = (value: unknown): value is UserRole => Object.values(UserRole).includes(value as UserRole);

export const isAuthUserPayload = (payload: unknown): payload is AuthUser => {
  if (!payload || typeof payload !== 'object') {
    return false;
  }

  const authPayload = payload as Partial<AuthUser>;

  return (
    typeof authPayload.userId === 'string' && typeof authPayload.login === 'string' && isUserRole(authPayload.role)
  );
};

export const isRefreshTokenPayload = (payload: unknown): payload is RefreshTokenPayload => {
  if (!isAuthUserPayload(payload)) {
    return false;
  }

  return typeof (payload as Partial<RefreshTokenPayload>).jti === 'string';
};
