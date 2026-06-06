import { IsString, IsEnum, IsNotEmpty } from 'class-validator';

import { MfaType } from '../types/mfa-method-settings.types.js';

export class VerifyMfaDto {
  @IsString()
  @IsNotEmpty()
  challengeToken: string;

  @IsEnum(MfaType)
  type: MfaType;

  @IsString()
  @IsNotEmpty()
  code: string;
}