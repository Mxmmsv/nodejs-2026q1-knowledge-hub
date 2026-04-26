import { describe, expect, it } from 'vitest';
import { parseLogLevel, shouldLog } from './log-level';

describe('log level helpers', () => {
  it('parses supported levels and falls back to log', () => {
    expect(parseLogLevel('debug')).toBe('debug');
    expect(parseLogLevel('verbose')).toBe('verbose');
    expect(parseLogLevel('fatal')).toBe('log');
    expect(parseLogLevel(undefined)).toBe('log');
  });

  it('compares levels by severity', () => {
    expect(shouldLog('warn', 'error')).toBe(true);
    expect(shouldLog('warn', 'warn')).toBe(true);
    expect(shouldLog('warn', 'log')).toBe(false);
    expect(shouldLog('error', 'fatal')).toBe(true);
  });
});
