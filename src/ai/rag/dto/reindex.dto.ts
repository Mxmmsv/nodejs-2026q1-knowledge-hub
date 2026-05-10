import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayNotEmpty, ArrayUnique, IsArray, IsBoolean, IsOptional, IsUUID } from 'class-validator';

export class ReindexRequestDto {
  @ApiPropertyOptional({
    default: true,
    description: 'When true, only published articles are indexed.',
  })
  @IsOptional()
  @IsBoolean()
  onlyPublished?: boolean = true;

  @ApiPropertyOptional({
    format: 'uuid',
    isArray: true,
    description: 'Optional article ids for selective reindexing.',
  })
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsUUID('4', { each: true })
  articleIds?: string[];
}

export class ReindexResponseDto {
  @ApiProperty()
  indexedArticles: number;

  @ApiProperty()
  indexedChunks: number;

  @ApiProperty()
  vectorCollection: string;
}
