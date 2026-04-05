import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { Response } from 'express';

interface ErrorResponseBody {
  error?: string;
  message?: string | string[];
  statusCode?: number;
}

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const statusCode = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    let error = HttpStatus[statusCode] ?? 'Error';
    let message: string | string[] = exception.message;

    if (typeof exceptionResponse === 'string') {
      message = exceptionResponse;
    } else {
      const body = exceptionResponse as ErrorResponseBody;
      error = body.error ?? error;
      message = body.message ?? message;
    }

    response.status(statusCode).json({
      statusCode,
      error,
      message,
    });
  }
}
