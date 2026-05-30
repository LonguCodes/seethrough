import { IsString, IsEnum, IsBoolean, IsOptional } from 'class-validator';
import { SsoType } from '../entities/sso-config.entity.js';

export class UpdateSsoConfigDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsEnum(SsoType)
  @IsOptional()
  type?: SsoType;

  @IsBoolean()
  @IsOptional()
  enabled?: boolean;

  @IsBoolean()
  @IsOptional()
  allowOnlySso?: boolean;

  @IsBoolean()
  @IsOptional()
  autoCreateUsers?: boolean;

  @IsString()
  @IsOptional()
  defaultRole?: string;

  @IsString()
  @IsOptional()
  samlEntryPoint?: string;

  @IsString()
  @IsOptional()
  samlIssuer?: string;

  @IsString()
  @IsOptional()
  samlCert?: string;

  @IsString()
  @IsOptional()
  oidcIssuerUrl?: string;

  @IsString()
  @IsOptional()
  oidcClientId?: string;

  @IsString()
  @IsOptional()
  oidcClientSecret?: string;
}