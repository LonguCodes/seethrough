import { IsString, IsEnum, IsBoolean, IsOptional, IsObject } from 'class-validator';

import { MfaType } from '../types/mfa-method-settings.types.js';

export class UpdateMfaConfigDto {
  @IsEnum(MfaType)
  @IsOptional()
  type?: MfaType;

  @IsString()
  @IsOptional()
  name?: string;

  @IsBoolean()
  @IsOptional()
  enabled?: boolean;

  @IsObject()
  @IsOptional()
  settings?: Record<string, unknown>;
}