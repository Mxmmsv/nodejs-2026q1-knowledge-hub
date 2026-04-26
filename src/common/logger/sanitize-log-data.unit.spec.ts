import { describe, expect, it } from 'vitest';
import { sanitizeLogData } from './sanitize-log-data';

describe('sanitizeLogData', () => {
  it('recursively redacts passwords and token-like fields without mutating the source', () => {
    const source = {
      password: 'secret',
      profile: {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        values: [{ token: 'nested-token' }],
      },
    };

    expect(sanitizeLogData(source)).toEqual({
      password: '[REDACTED]',
      profile: {
        accessToken: '[REDACTED]',
        refreshToken: '[REDACTED]',
        values: [{ token: '[REDACTED]' }],
      },
    });
    expect(source.profile.accessToken).toBe('access-token');
  });

  it('handles circular references safely', () => {
    const source: Record<string, unknown> = {};
    source.self = source;

    expect(sanitizeLogData(source)).toEqual({ self: '[Circular]' });
  });
});
