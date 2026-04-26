import 'reflect-metadata';
import { afterEach, beforeEach, vi } from 'vitest';

const unitEnv = {
  CRYPT_SALT: '1',
  JWT_SECRET: 'unit-access-secret',
  JWT_REFRESH_SECRET: 'unit-refresh-secret',
  JWT_ACCESS_TTL: '15m',
  JWT_REFRESH_TTL: '7d',
  AUTH_RATE_LIMIT_MAX: '3',
  AUTH_RATE_LIMIT_WINDOW_SECONDS: '60',
  LOG_LEVEL: 'log',
  LOG_MAX_FILE_SIZE: '1024',
};

beforeEach(() => {
  Object.assign(process.env, unitEnv);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
  delete process.env.TEST_MODE;
});
