import { IsString, IsNotEmpty, IsIn, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({ description: 'Username for the invited user' })
  @IsString()
  @IsNotEmpty()
  username: string;

  @ApiProperty({ description: 'Role for the invited user', enum: ['admin', 'viewer'], default: 'viewer' })
  @IsString()
  @IsIn(['admin', 'viewer'])
  @IsOptional()
  role?: string = 'viewer';
}
