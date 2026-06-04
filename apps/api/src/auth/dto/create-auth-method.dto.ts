import { IsString, IsEnum, IsBoolean, IsOptional, IsNumber, IsObject } from 'class-validator';
import { AuthMethodType } from '../types/auth-method-type.js';

export class CreateAuthMethodDto {
  @IsEnum(AuthMethodType)
  type: AuthMethodType;

  @IsString()
  name: string;

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
  settings: Record<string, any>;
}