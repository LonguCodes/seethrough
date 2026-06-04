export enum MfaType {
  TOTP = 'totp',
  EMAIL = 'email',
  PASSKEY = 'passkey',
}

export interface TotpSettings {
  type: MfaType.TOTP;
  issuer: string;
  digits: number;
  period: number;
}

export interface EmailSettings {
  type: MfaType.EMAIL;
  from: string;
  subject: string;
  ttl: number;
}

export interface PasskeySettings {
  type: MfaType.PASSKEY;
  relyingPartyId: string;
  relyingPartyName: string;
  userVerification: 'required' | 'preferred' | 'discouraged';
}

export type MfaMethodSettings = TotpSettings | EmailSettings | PasskeySettings;