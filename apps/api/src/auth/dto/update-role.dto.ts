import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsBoolean, IsArray, IsOptional } from 'class-validator';

export class UpdateRoleDto {
  @ApiProperty({ description: 'Unique role name', required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ description: 'If true, this role grants all permissions', required: false })
  @IsBoolean()
  @IsOptional()
  superadmin?: boolean;

  @ApiProperty({ description: 'List of permission strings', required: false })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  permissions?: string[];
}