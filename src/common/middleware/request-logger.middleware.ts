import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger(RequestLoggerMiddleware.name);

  use(request: Request, response: Response, next: NextFunction): void {
    const startedAt = Date.now();

    response.on('finish', () => {
      const durationInMs = Date.now() - startedAt;
      this.logger.log(`${request.method} ${request.originalUrl} ${response.statusCode} ${durationInMs}ms`);
    });

    next();
  }
}
