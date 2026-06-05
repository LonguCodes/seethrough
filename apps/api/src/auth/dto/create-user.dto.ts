import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateUserDto {
  @ApiProperty({ description: 'Username for the invited user' })
  @IsString()
  @IsNotEmpty()
  username: string;

  @ApiProperty({ description: 'Role name for the invited user', default: 'viewer' })
  @IsString()
  @IsOptional()
  role?: string = 'viewer';
}