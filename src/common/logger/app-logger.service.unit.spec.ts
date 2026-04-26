import { describe, expect, it } from 'vitest';
import { AppLoggerService } from './app-logger.service';
import { LogWriter } from './log-writer';

class MemoryLogWriter implements LogWriter {
  readonly lines: string[] = [];

  write(line: string): void {
    this.lines.push(line);
  }
}

describe('AppLoggerService', () => {
  it('filters messages by configured log level and always logs fatal messages', () => {
    const writer = new MemoryLogWriter();
    const logger = new AppLoggerService([writer], 'warn', 'development');

    logger.log('hidden log', 'Test');
    logger.debug('hidden debug', 'Test');
    logger.warn('visible warn', 'Test');
    logger.error('visible error', 'trace', 'Test');
    logger.fatal('visible fatal', 'fatal trace', 'Test');

    expect(writer.lines).toHaveLength(3);
    expect(writer.lines[0]).toContain('WARN [Test] visible warn');
    expect(writer.lines[1]).toContain('ERROR [Test] visible error');
    expect(writer.lines[2]).toContain('FATAL [Test] visible fatal');
  });

  it('formats production logs as structured JSON and sanitizes metadata', () => {
    const writer = new MemoryLogWriter();
    const logger = new AppLoggerService([writer], 'verbose', 'production');

    logger.log('login attempt', 'Auth', {
      login: 'user',
      password: 'secret',
      nested: {
        refreshToken: 'refresh-token',
      },
    });

    const record = JSON.parse(writer.lines[0]);

    expect(record).toMatchObject({
      level: 'log',
      context: 'Auth',
      message: 'login attempt',
      meta: {
        login: 'user',
        password: '[REDACTED]',
        nested: {
          refreshToken: '[REDACTED]',
        },
      },
    });
    expect(record.timestamp).toEqual(expect.any(String));
  });

  it('formats non-string messages for human-readable logs', () => {
    const writer = new MemoryLogWriter();
    const logger = new AppLoggerService([writer], 'log', 'development');

    logger.log({ event: 'started' }, 'Bootstrap');

    expect(writer.lines[0]).toContain("LOG [Bootstrap] { event: 'started' }");
  });
});
