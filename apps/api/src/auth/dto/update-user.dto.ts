import { IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateUserDto {
  @ApiProperty({ description: 'Role name to assign to the user', required: false })
  @IsString()
  @IsOptional()
  role?: string;
}