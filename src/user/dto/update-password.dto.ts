import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class UpdatePasswordDto {
  @ApiProperty({
    example: 'TEST_PASSWORD',
  })
  @IsString()
  @IsNotEmpty()
  oldPassword: string;

  @ApiProperty({
    example: 'NEW_PASSWORD',
  })
  @IsString()
  @IsNotEmpty()
  newPassword: string;
}
