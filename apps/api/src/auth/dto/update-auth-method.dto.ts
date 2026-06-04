import { IsString, IsEnum, IsBoolean, IsOptional, IsNumber, IsObject } from 'class-validator';
import { AuthMethodType } from '../types/auth-method-type.js';

export class UpdateAuthMethodDto {
  @IsEnum(AuthMethodType)
  @IsOptional()
  type?: AuthMethodType;

  @IsString()
  @IsOptional()
  name?: string;

  @IsBoolean()
  @IsOptional()
  enabled?: boolean;

  @IsNumber()
  @IsOptional()
  priority?: number;

  @IsBoolean()
  @IsOptional()
  autoCreateUsers?: boolean;

  @IsString()
  @IsOptional()
  defaultRole?: string;

  @IsString()
  @IsOptional()
  mfaConfigId?: string;

  @IsObject()
  @IsOptional()
  settings?: Record<string, any>;
}