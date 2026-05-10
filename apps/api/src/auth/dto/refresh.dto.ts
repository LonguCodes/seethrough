import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RefreshDto {
  @ApiProperty({ description: 'The refresh token obtained during login' })
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}
