import { EventEmitter } from 'events';
import { Request, Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppLoggerService } from '../logger';
import { RequestLoggerMiddleware } from './request-logger.middleware';

describe('RequestLoggerMiddleware', () => {
  let logger: {
    log: ReturnType<typeof vi.fn>;
  };
  let middleware: RequestLoggerMiddleware;

  beforeEach(() => {
    logger = {
      log: vi.fn(),
    };
    middleware = new RequestLoggerMiddleware(logger as unknown as AppLoggerService);
  });

  it('logs sanitized incoming requests and outgoing responses', () => {
    vi.spyOn(Date, 'now').mockReturnValueOnce(1000).mockReturnValueOnce(1042);
    const request = {
      method: 'POST',
      originalUrl: '/auth/login?token=query-token',
      url: '/auth/login',
      query: {
        token: 'query-token',
      },
      body: {
        login: 'user',
        password: 'secret',
      },
    } as unknown as Request;
    const response = new EventEmitter() as Response & EventEmitter;
    response.statusCode = 201;
    const next = vi.fn();

    middleware.use(request, response, next);
    response.emit('finish');

    expect(next).toHaveBeenCalledOnce();
    expect(logger.log).toHaveBeenNthCalledWith(1, 'Incoming request', RequestLoggerMiddleware.name, {
      method: 'POST',
      url: '/auth/login?token=query-token',
      query: {
        token: '[REDACTED]',
      },
      body: {
        login: 'user',
        password: '[REDACTED]',
      },
    });
    expect(logger.log).toHaveBeenNthCalledWith(2, 'Outgoing response', RequestLoggerMiddleware.name, {
      method: 'POST',
      url: '/auth/login?token=query-token',
      statusCode: 201,
      responseTimeMs: 42,
    });
  });
});
