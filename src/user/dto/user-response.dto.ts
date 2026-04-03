import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../../common/enums/user-role.enum';

export class UserResponseDto {
  @ApiProperty({
    format: 'uuid',
  })
  id: string;

  @ApiProperty()
  login: string;

  @ApiProperty({
    enum: UserRole,
  })
  role: UserRole;

  @ApiProperty()
  createdAt: number;

  @ApiProperty()
  updatedAt: number;
}
