import { ApiProperty } from '@nestjs/swagger';
import { ArticleStatus } from '../../common/enums/article-status.enum';

export class ArticleResponseDto {
  @ApiProperty({
    format: 'uuid',
  })
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  content: string;

  @ApiProperty({
    enum: ArticleStatus,
  })
  status: ArticleStatus;

  @ApiProperty({
    format: 'uuid',
    nullable: true,
  })
  authorId: string | null;

  @ApiProperty({
    format: 'uuid',
    nullable: true,
  })
  categoryId: string | null;

  @ApiProperty({
    type: String,
    isArray: true,
  })
  tags: string[];

  @ApiProperty()
  createdAt: number;

  @ApiProperty()
  updatedAt: number;
}
