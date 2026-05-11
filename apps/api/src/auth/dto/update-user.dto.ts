import { IsString, IsIn, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateUserDto {
  @ApiProperty({ description: 'Updated role', enum: ['admin', 'viewer'], required: false })
  @IsString()
  @IsIn(['admin', 'viewer'])
  @IsOptional()
  role?: string;
}
