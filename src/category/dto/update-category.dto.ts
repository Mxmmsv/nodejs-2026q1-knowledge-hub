import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class UpdateCategoryDto {
  @ApiProperty({
    example: 'Technology',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    example: 'Updated category description',
  })
  @IsString()
  @IsNotEmpty()
  description: string;
}
