import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class GenerateDto {
  @ApiProperty({
    example: 'Suggest three article ideas about Node.js performance.',
  })
  @IsString()
  @IsNotEmpty()
  prompt: string;

  @ApiPropertyOptional({
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID('4')
  sessionId?: string;

  @ApiPropertyOptional({
    example: 'Answer as a concise technical reviewer.',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  systemInstruction?: string;
}
