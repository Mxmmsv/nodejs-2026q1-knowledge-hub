import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateCommentDto {
  @ApiProperty({
    example: 'Great article!',
  })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiProperty({
    format: 'uuid',
  })
  @IsUUID('4')
  articleId: string;

  @ApiPropertyOptional({
    format: 'uuid',
    nullable: true,
  })
  @IsOptional()
  @IsUUID('4')
  authorId?: string | null;
}
