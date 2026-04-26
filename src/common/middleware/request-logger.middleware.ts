import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { AppLoggerService, sanitizeLogData } from '../logger';

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  constructor(private readonly logger: AppLoggerService) {}

  use(request: Request, response: Response, next: NextFunction): void {
    const startedAt = Date.now();
    const url = request.originalUrl ?? request.url;

    this.logger.log('Incoming request', RequestLoggerMiddleware.name, {
      method: request.method,
      url,
      query: sanitizeLogData(request.query),
      body: sanitizeLogData(request.body),
    });

    response.on('finish', () => {
      this.logger.log('Outgoing response', RequestLoggerMiddleware.name, {
        method: request.method,
        url,
        statusCode: response.statusCode,
        responseTimeMs: Date.now() - startedAt,
      });
    });

    next();
  }
}
