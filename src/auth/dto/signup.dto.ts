import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class SignupDto {
  @ApiProperty({
    example: 'TEST_LOGIN',
  })
  @IsString()
  @IsNotEmpty()
  login: string;

  @ApiProperty({
    example: 'TEST_PASSWORD',
  })
  @IsString()
  @IsNotEmpty()
  password: string;
}
