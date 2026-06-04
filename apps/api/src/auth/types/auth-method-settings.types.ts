import { AuthMethodType } from './auth-method-type.js';

export interface PasswordAuthSettings {
  type: AuthMethodType.PASSWORD;
  minPasswordLength: number;
  requireComplexity: boolean;
}

export interface OidcAuthSettings {
  type: AuthMethodType.OIDC;
  issuerUrl: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
}

export interface SamlAuthSettings {
  type: AuthMethodType.SAML;
  entryPoint: string;
  issuer: string;
  cert?: string;
}

export type AuthMethodSettings = PasswordAuthSettings | OidcAuthSettings | SamlAuthSettings;