import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class RefreshDto {
  @ApiProperty({ description: 'The refresh token obtained during login' })
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}
