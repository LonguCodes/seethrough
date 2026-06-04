import { UserMfa } from '../../entities/user-mfa.entity.js';
import { MfaConfig } from '../../entities/mfa-config.entity.js';

export interface MfaStrategy {
  /** The MFA type name matching MfaType enum values */
  name: string;

  /**
   * Generate a challenge/code for this MFA method.
   * For TOTP this would generate the verification prompt,
   * for email this would send the code, etc.
   */
  generateChallenge?(config: MfaConfig, enrollment: UserMfa): Promise<string | void>;

  /**
   * Verify a submitted code against the enrollment.
   */
  verify(config: MfaConfig, enrollment: UserMfa, code: string): Promise<boolean>;
}