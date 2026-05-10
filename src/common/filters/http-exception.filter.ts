import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { Response } from 'express';
import { AppError } from '../errors';
import { AppLoggerService } from '../logger';

interface ErrorResponseBody {
  error?: string;
  message?: string | string[];
  statusCode?: number;
}

interface ErrorResponse {
  statusCode: number;
  error: string;
  message: string | string[];
}

const defaultErrorLabels: Record<number, string> = {
  [HttpStatus.BAD_REQUEST]: 'Bad Request',
  [HttpStatus.UNAUTHORIZED]: 'Unauthorized',
  [HttpStatus.FORBIDDEN]: 'Forbidden',
  [HttpStatus.NOT_FOUND]: 'Not Found',
  [HttpStatus.TOO_MANY_REQUESTS]: 'Too Many Requests',
  [HttpStatus.INTERNAL_SERVER_ERROR]: 'Internal Server Error',
  [HttpStatus.SERVICE_UNAVAILABLE]: 'Service Unavailable',
};

const getDefaultErrorLabel = (statusCode: number): string => defaultErrorLabels[statusCode] ?? 'Error';

@Injectable()
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: AppLoggerService) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const errorResponse = this.toErrorResponse(exception);

    this.logException(exception, errorResponse);
    response.status(errorResponse.statusCode).json(errorResponse);
  }

  private toErrorResponse(exception: unknown): ErrorResponse {
    if (exception instanceof AppError) {
      return {
        statusCode: exception.statusCode,
        error: getDefaultErrorLabel(exception.statusCode),
        message: exception.message,
      };
    }

    if (exception instanceof HttpException) {
      const statusCode = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      let error = getDefaultErrorLabel(statusCode);
      let message: string | string[] = exception.message;

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else {
        const body = exceptionResponse as ErrorResponseBody;
        error = body.error ?? error;
        message = body.message ?? message;
      }

      return {
        statusCode,
        error,
        message,
      };
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
    };
  }

  private logException(exception: unknown, errorResponse: ErrorResponse): void {
    if (exception instanceof Error) {
      this.logger.error(exception.message, exception.stack, HttpExceptionFilter.name, {
        statusCode: errorResponse.statusCode,
        error: errorResponse.error,
      });
      return;
    }

    this.logger.error(String(exception), undefined, HttpExceptionFilter.name, {
      statusCode: errorResponse.statusCode,
      error: errorResponse.error,
    });
  }
}
