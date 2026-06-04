import { IsString, IsEnum, IsBoolean, IsOptional, IsObject } from 'class-validator';
import { MfaType } from '../types/mfa-method-settings.types.js';

export class CreateMfaConfigDto {
  @IsEnum(MfaType)
  type: MfaType;

  @IsString()
  name: string;

  @IsBoolean()
  @IsOptional()
  enabled?: boolean;

  @IsObject()
  settings: Record<string, any>;
}