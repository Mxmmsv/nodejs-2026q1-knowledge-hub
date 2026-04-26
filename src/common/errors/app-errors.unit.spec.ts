import { HttpStatus } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { ForbiddenError, NotFoundError, UnauthorizedError, ValidationError } from './app-errors';

describe('custom app errors', () => {
  it('exposes required status codes and messages', () => {
    expect(new NotFoundError('Missing')).toMatchObject({
      name: 'NotFoundError',
      message: 'Missing',
      statusCode: HttpStatus.NOT_FOUND,
    });
    expect(new ValidationError('Invalid')).toMatchObject({
      statusCode: HttpStatus.BAD_REQUEST,
    });
    expect(new UnauthorizedError('Missing token')).toMatchObject({
      statusCode: HttpStatus.UNAUTHORIZED,
    });
    expect(new ForbiddenError()).toMatchObject({
      message: 'Forbidden',
      statusCode: HttpStatus.FORBIDDEN,
    });
  });
});
