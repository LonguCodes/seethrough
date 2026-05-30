import { IsString, IsEnum, IsBoolean, IsOptional, ValidateIf } from 'class-validator';
import { SsoType } from '../entities/sso-config.entity.js';

export class CreateSsoConfigDto {
  @IsString()
  name: string;

  @IsEnum(SsoType)
  type: SsoType;

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

  // SAML fields
  @ValidateIf((o) => o.type === SsoType.SAML)
  @IsString()
  samlEntryPoint?: string;

  @ValidateIf((o) => o.type === SsoType.SAML)
  @IsString()
  samlIssuer?: string;

  @ValidateIf((o) => o.type === SsoType.SAML)
  @IsString()
  @IsOptional()
  samlCert?: string;

  // OIDC fields
  @ValidateIf((o) => o.type === SsoType.OIDC)
  @IsString()
  oidcIssuerUrl?: string;

  @ValidateIf((o) => o.type === SsoType.OIDC)
  @IsString()
  oidcClientId?: string;

  @ValidateIf((o) => o.type === SsoType.OIDC)
  @IsString()
  @IsOptional()
  oidcClientSecret?: string;
}