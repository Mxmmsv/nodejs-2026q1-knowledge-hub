import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { UserRole } from '../../common/enums/user-role.enum';

export class CreateUserDto {
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

  @ApiPropertyOptional({
    enum: UserRole,
    default: UserRole.VIEWER,
  })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}
