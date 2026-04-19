import { ApiProperty } from '@nestjs/swagger';

export class RefreshTokenBodyDto {
  @ApiProperty()
  refreshToken?: string;
}
