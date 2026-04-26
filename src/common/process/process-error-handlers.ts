import { INestApplication } from '@nestjs/common';
import { AppLoggerService } from '../logger';

type ExitCallback = (code?: number) => never | void;
type ShutdownLogLevel = 'fatal' | 'error';

const normalizeError = (reason: unknown): Error => {
  if (reason instanceof Error) {
    return reason;
  }

  if (typeof reason === 'string') {
    return new Error(reason);
  }

  try {
    return new Error(JSON.stringify(reason));
  } catch {
    return new Error(String(reason));
  }
};

export const createGracefulShutdownHandler = (
  app: Pick<INestApplication, 'close'>,
  logger: Pick<AppLoggerService, 'fatal' | 'error'>,
  exit: ExitCallback = process.exit,
) => {
  let isShuttingDown = false;

  return async (source: string, reason: unknown, level: ShutdownLogLevel): Promise<void> => {
    if (isShuttingDown) {
      return;
    }

    isShuttingDown = true;
    const error = normalizeError(reason);
    const message = `${source}: ${error.message}`;

    if (level === 'fatal') {
      logger.fatal(message, error.stack, 'ProcessErrorHandler');
    } else {
      logger.error(message, error.stack, 'ProcessErrorHandler');
    }

    try {
      await app.close();
    } catch (shutdownError) {
      const normalizedShutdownError = normalizeError(shutdownError);
      logger.error(
        `Graceful shutdown failed: ${normalizedShutdownError.message}`,
        normalizedShutdownError.stack,
        'ProcessErrorHandler',
      );
    } finally {
      exit(1);
    }
  };
};

export const registerProcessErrorHandlers = (
  app: INestApplication,
  logger: Pick<AppLoggerService, 'fatal' | 'error'>,
  exit: ExitCallback = process.exit,
): void => {
  const shutdown = createGracefulShutdownHandler(app, logger, exit);

  process.on('uncaughtException', (error) => {
    void shutdown('uncaughtException', error, 'fatal');
  });

  process.on('unhandledRejection', (reason) => {
    void shutdown('unhandledRejection', reason, 'error');
  });
};
