import { describe, expect, it, vi } from 'vitest';
import { createGracefulShutdownHandler, registerProcessErrorHandlers } from './process-error-handlers';

describe('process error handlers', () => {
  it('logs uncaught exceptions at fatal level and shuts down once', async () => {
    const app = {
      close: vi.fn(async () => undefined),
    };
    const logger = {
      fatal: vi.fn(),
      error: vi.fn(),
    };
    const exit = vi.fn();
    const shutdown = createGracefulShutdownHandler(app, logger, exit);
    const error = new Error('boom');

    await shutdown('uncaughtException', error, 'fatal');
    await shutdown('uncaughtException', new Error('second'), 'fatal');

    expect(logger.fatal).toHaveBeenCalledWith('uncaughtException: boom', error.stack, 'ProcessErrorHandler');
    expect(app.close).toHaveBeenCalledOnce();
    expect(exit).toHaveBeenCalledWith(1);
  });

  it('logs unhandled rejections at error level and reports shutdown failures', async () => {
    const closeError = new Error('close failed');
    const app = {
      close: vi.fn(async () => {
        throw closeError;
      }),
    };
    const logger = {
      fatal: vi.fn(),
      error: vi.fn(),
    };
    const exit = vi.fn();
    const shutdown = createGracefulShutdownHandler(app, logger, exit);

    await shutdown('unhandledRejection', 'rejection reason', 'error');

    expect(logger.error).toHaveBeenNthCalledWith(
      1,
      'unhandledRejection: rejection reason',
      expect.any(String),
      'ProcessErrorHandler',
    );
    expect(logger.error).toHaveBeenNthCalledWith(
      2,
      'Graceful shutdown failed: close failed',
      closeError.stack,
      'ProcessErrorHandler',
    );
    expect(exit).toHaveBeenCalledWith(1);
  });

  it('registers process listeners for fatal runtime errors', () => {
    const app = {
      close: vi.fn(async () => undefined),
    };
    const logger = {
      fatal: vi.fn(),
      error: vi.fn(),
    };
    const exit = vi.fn();
    const processOn = vi.spyOn(process, 'on').mockReturnValue(process);

    registerProcessErrorHandlers(app as never, logger, exit);

    expect(processOn).toHaveBeenCalledWith('uncaughtException', expect.any(Function));
    expect(processOn).toHaveBeenCalledWith('unhandledRejection', expect.any(Function));
  });
});
