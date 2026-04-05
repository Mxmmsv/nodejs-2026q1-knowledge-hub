import { ApiProperty } from '@nestjs/swagger';

export class ErrorResponseDto {
  @ApiProperty({
    example: 400,
  })
  statusCode: number;

  @ApiProperty({
    example: 'Bad Request',
  })
  error: string;

  @ApiProperty({
    oneOf: [
      {
        type: 'string',
        example: 'Invalid UUID',
      },
      {
        type: 'array',
        items: {
          type: 'string',
        },
        example: ['title should not be empty', 'content should not be empty'],
      },
    ],
  })
  message: string | string[];
}
