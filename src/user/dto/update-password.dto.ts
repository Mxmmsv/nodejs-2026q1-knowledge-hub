import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString, ValidateIf } from 'class-validator';
import { UserRole } from '../../common/enums/user-role.enum';

export class UpdateUserDto {
  @ApiProperty({
    example: 'TEST_PASSWORD',
  })
  @ValidateIf((dto: UpdateUserDto) => dto.role === undefined || dto.newPassword !== undefined)
  @IsString()
  @IsNotEmpty()
  oldPassword?: string;

  @ApiProperty({
    example: 'NEW_PASSWORD',
  })
  @ValidateIf((dto: UpdateUserDto) => dto.role === undefined || dto.oldPassword !== undefined)
  @IsString()
  @IsNotEmpty()
  newPassword?: string;

  @ApiPropertyOptional({
    enum: UserRole,
  })
  @ValidateIf((dto: UpdateUserDto) => dto.oldPassword === undefined && dto.newPassword === undefined)
  @IsEnum(UserRole)
  role?: UserRole;
}
