import { LoggerService } from '@nestjs/common';
import { inspect } from 'util';
import { AppLogLevel, ExtendedLogLevel, parseLogLevel, shouldLog } from './log-level';
import { LogWriter, RotatingFileLogWriter, StreamLogWriter } from './log-writer';
import { sanitizeLogData } from './sanitize-log-data';

interface LogRecord {
  timestamp: string;
  level: ExtendedLogLevel;
  message: string;
  context?: string;
  trace?: string;
  meta?: unknown;
}

export class AppLoggerService implements LoggerService {
  private readonly configuredLevel: AppLogLevel;
  private readonly isProduction: boolean;
  private readonly writers: LogWriter[];

  constructor(writers?: LogWriter[], configuredLevel = parseLogLevel(), nodeEnv = process.env.NODE_ENV) {
    this.configuredLevel = configuredLevel;
    this.isProduction = nodeEnv === 'production';
    this.writers = writers ?? [new StreamLogWriter(), new RotatingFileLogWriter()];
  }

  log(message: unknown, context?: string, meta?: unknown): void {
    this.write('log', message, context, undefined, meta);
  }

  error(message: unknown, trace?: string, context?: string, meta?: unknown): void {
    this.write('error', message, context, trace, meta);
  }

  warn(message: unknown, context?: string, meta?: unknown): void {
    this.write('warn', message, context, undefined, meta);
  }

  debug(message: unknown, context?: string, meta?: unknown): void {
    this.write('debug', message, context, undefined, meta);
  }

  verbose(message: unknown, context?: string, meta?: unknown): void {
    this.write('verbose', message, context, undefined, meta);
  }

  fatal(message: unknown, trace?: string, context?: string, meta?: unknown): void {
    this.write('fatal', message, context, trace, meta);
  }

  private write(level: ExtendedLogLevel, message: unknown, context?: string, trace?: string, meta?: unknown): void {
    if (!shouldLog(this.configuredLevel, level)) {
      return;
    }

    const record: LogRecord = {
      timestamp: new Date().toISOString(),
      level,
      message: this.formatMessage(message),
      ...(context ? { context } : {}),
      ...(trace ? { trace } : {}),
      ...(meta === undefined ? {} : { meta: sanitizeLogData(meta) }),
    };
    const line = this.isProduction ? JSON.stringify(record) : this.formatHumanReadable(record);

    for (const writer of this.writers) {
      writer.write(line);
    }
  }

  private formatMessage(message: unknown): string {
    return typeof message === 'string' ? message : inspect(message, { depth: 5, colors: false });
  }

  private formatHumanReadable(record: LogRecord): string {
    const context = record.context ? ` [${record.context}]` : '';
    const meta = record.meta === undefined ? '' : ` ${inspect(record.meta, { depth: 5, colors: false })}`;
    const trace = record.trace ? `\n${record.trace}` : '';

    return `[${record.timestamp}] ${record.level.toUpperCase()}${context} ${record.message}${meta}${trace}`;
  }
}
