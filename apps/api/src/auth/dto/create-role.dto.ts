import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsBoolean, IsArray, IsOptional } from 'class-validator';

export class CreateRoleDto {
  @ApiProperty({ description: 'Unique role name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'If true, this role grants all permissions', default: false })
  @IsBoolean()
  @IsOptional()
  superadmin?: boolean = false;

  @ApiProperty({ description: 'List of permission strings' })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  permissions?: string[] = [];
}