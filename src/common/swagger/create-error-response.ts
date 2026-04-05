import { ApiResponseOptions, getSchemaPath } from '@nestjs/swagger';
import { ErrorResponseDto } from '../dto/error-response.dto';

interface ErrorResponseExample {
  statusCode: number;
  error: string;
  message: string | string[];
}

interface CreateErrorResponseOptions {
  description: string;
  example: ErrorResponseExample;
}

export function createErrorResponse(options: CreateErrorResponseOptions): ApiResponseOptions {
  return {
    description: options.description,
    schema: {
      allOf: [{ $ref: getSchemaPath(ErrorResponseDto) }],
      example: options.example,
    },
  };
}
