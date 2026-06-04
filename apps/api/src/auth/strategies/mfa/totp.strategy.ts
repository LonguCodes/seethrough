import { Injectable } from '@nestjs/common';
import * as OTPAuth from 'otpauth';
import { MfaStrategy } from './mfa-strategy.interface.js';
import { UserMfa } from '../../entities/user-mfa.entity.js';
import { MfaConfig } from '../../entities/mfa-config.entity.js';
import type { TotpSettings } from '../../types/mfa-method-settings.types.js';

@Injectable()
export class TotpStrategy implements MfaStrategy {
  name = 'totp';

  /**
   * Generate a new cryptographically random base32 TOTP secret.
   */
  generateSecret(): string {
    const secret = new OTPAuth.Secret({ size: 20 });
    return secret.base32;
  }

  async verify(config: MfaConfig, enrollment: UserMfa, code: string): Promise<boolean> {
    const settings = config.settings as unknown as TotpSettings;
    const secret = enrollment.secret;

    console.log(settings, secret);
    if (!secret) return false;

    const totp = new OTPAuth.TOTP({
      issuer: settings.issuer,
      label: 'user',
      algorithm: 'SHA1',
      digits: settings.digits || 6,
      period: settings.period || 30,
      secret: OTPAuth.Secret.fromBase32(secret),
    });

    // Validate with ±1 time step window (allow 30s either side)
    const delta = totp.validate({ token: code, window: 1 });
    return delta !== null;
  }
}