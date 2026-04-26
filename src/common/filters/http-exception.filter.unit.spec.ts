import { BadRequestException, HttpException, HttpStatus, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createArgumentsHost } from '../../../test/unit/mock-execution-context';
import { ForbiddenError } from '../errors';
import { HttpExceptionFilter } from './http-exception.filter';

describe('HttpExceptionFilter', () => {
  let filter: HttpExceptionFilter;
  let response: {
    status: ReturnType<typeof vi.fn>;
    json: ReturnType<typeof vi.fn>;
  };
  let logger: {
    error: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    logger = {
      error: vi.fn(),
    };
    filter = new HttpExceptionFilter(logger as never);
    response = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
  });

  it('formats string exception responses', () => {
    filter.catch(new NotFoundException('Missing item'), createArgumentsHost(response));

    expect(response.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    expect(response.json).toHaveBeenCalledWith({
      statusCode: HttpStatus.NOT_FOUND,
      error: 'Not Found',
      message: 'Missing item',
    });
    expect(logger.error).toHaveBeenCalledWith(
      'Missing item',
      expect.any(String),
      HttpExceptionFilter.name,
      expect.objectContaining({ statusCode: HttpStatus.NOT_FOUND }),
    );
  });

  it('formats object exception responses with validation message arrays', () => {
    const exception = new BadRequestException(['login should not be empty']);

    filter.catch(exception, createArgumentsHost(response));

    expect(response.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(response.json).toHaveBeenCalledWith({
      statusCode: HttpStatus.BAD_REQUEST,
      error: 'Bad Request',
      message: ['login should not be empty'],
    });
  });

  it('uses fallback error names for custom statuses', () => {
    const exception = new HttpException({ message: 'Custom message' }, 499);

    filter.catch(exception, createArgumentsHost(response));

    expect(response.json).toHaveBeenCalledWith({
      statusCode: 499,
      error: 'Error',
      message: 'Custom message',
    });
  });

  it('uses explicit error labels from object responses', () => {
    const exception = new HttpException({ error: 'Custom Error', message: 'Custom message' }, HttpStatus.CONFLICT);

    filter.catch(exception, createArgumentsHost(response));

    expect(response.json).toHaveBeenCalledWith({
      statusCode: HttpStatus.CONFLICT,
      error: 'Custom Error',
      message: 'Custom message',
    });
  });

  it('formats custom app errors', () => {
    filter.catch(new ForbiddenError('No access'), createArgumentsHost(response));

    expect(response.status).toHaveBeenCalledWith(HttpStatus.FORBIDDEN);
    expect(response.json).toHaveBeenCalledWith({
      statusCode: HttpStatus.FORBIDDEN,
      error: 'Forbidden',
      message: 'No access',
    });
  });

  it('hides unknown errors behind a generic 500 response', () => {
    const exception = new Error('database password leaked');

    filter.catch(exception, createArgumentsHost(response));

    expect(response.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(response.json).toHaveBeenCalledWith({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
    });
    expect(logger.error).toHaveBeenCalledWith(
      'database password leaked',
      exception.stack,
      HttpExceptionFilter.name,
      expect.objectContaining({ statusCode: HttpStatus.INTERNAL_SERVER_ERROR }),
    );
  });
});
