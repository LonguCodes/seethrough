import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class UpdateUserDto {
  @ApiProperty({ description: 'Role name to assign to the user', required: false })
  @IsString()
  @IsOptional()
  role?: string;
}