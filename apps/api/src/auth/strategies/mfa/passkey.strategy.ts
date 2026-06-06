import { Injectable } from "@nestjs/common";
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from "@simplewebauthn/server";
import type { AuthenticatorTransportFuture } from "@simplewebauthn/server";

import type { MfaStrategy } from "./mfa-strategy.interface.js";
import type { MfaConfig } from "../../entities/mfa-config.entity.js";
import type { UserMfa } from "../../entities/user-mfa.entity.js";

// In-memory store for challenges (production: use Redis)
const challengeStore = new Map<string, { challenge: string; expiresAt: Date }>();

interface StoredRegistration {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  options: any;
  expiresAt: Date;
}

const registrationStore = new Map<string, StoredRegistration>();

const RP_ID = process.env.WEBAUTHN_RP_ID || "localhost";
const ORIGIN = process.env.WEB_BASE_URL || "http://localhost:3000";

function getSetting<T>(config: MfaConfig, key: string, fallback: T): T {
  const settings = config.settings as Record<string, unknown> | undefined;
  return (settings?.[key] as T) ?? fallback;
}

@Injectable()
export class PasskeyStrategy implements MfaStrategy {
  name = "passkey";

  /**
   * Generate registration options for enrolling a new passkey.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async generateRegistrationOptions(userId: string, username: string, config: MfaConfig): Promise<any> {
    const rpId = getSetting(config, "relyingPartyId", RP_ID);
    const rpName = getSetting(config, "relyingPartyName", "SeeThrough");

    const options = await generateRegistrationOptions({
      rpName,
      rpID: rpId,
      userName: username,
      userDisplayName: username,
      attestationType: "none",
      authenticatorSelection: {
        residentKey: "preferred",
        userVerification: getSetting(config, "userVerification", "preferred"),
      },
    });

    registrationStore.set(userId, {
      options,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    });

    return options;
  }

  /**
   * Verify the registration response from the client.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async verifyRegistration(userId: string, response: any): Promise<any> {
    const stored = registrationStore.get(userId);
    if (!stored || stored.expiresAt < new Date()) {
      registrationStore.delete(userId);
      return null;
    }

    try {
      const verification = await verifyRegistrationResponse({
        response,
        expectedChallenge: stored.options.challenge,
        expectedOrigin: ORIGIN,
        expectedRPID: RP_ID,
      });

      if (!verification.verified || !verification.registrationInfo) {
        return null;
      }

      registrationStore.delete(userId);
      return verification.registrationInfo.credential;
    } catch {
      return null;
    }
  }

  /**
   * Generate authentication options (challenge) for passkey MFA.
   * Returns options to pass to navigator.credentials.get().
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async generateAuthenticationOptions(enrollments: UserMfa[], config: MfaConfig, challengeToken: string): Promise<any> {
    const rpId = getSetting(config, "relyingPartyId", RP_ID);

    const validEnrollments = enrollments.filter((e) => e.credentialId);
    if (validEnrollments.length === 0) return null;

    const options = await generateAuthenticationOptions({
      rpID: rpId,
      userVerification: getSetting(config, "userVerification", "preferred"),
      allowCredentials: validEnrollments.map((e) => ({
        id: e.credentialId!,
        transports: (e.destination?.split(",") as AuthenticatorTransportFuture[]) ?? undefined,
      })),
    });

    challengeStore.set(challengeToken, {
      challenge: options.challenge,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    });

    // Also store by each enrollment ID so verify() can look up the challenge
    for (const e of validEnrollments) {
      challengeStore.set(e.id, {
        challenge: options.challenge,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      });
    }

    return options;
  }

  /**
   * Generate a passkey challenge for the MFA flow.
   */
  async generateChallenge(_config: MfaConfig, _enrollment: UserMfa): Promise<string> {
    return "passkey-challenge";
  }

  /**
   * Verify a passkey assertion response.
   * The 'code' parameter is a JSON string containing the authenticator assertion response.
   */
  async verify(_config: MfaConfig, enrollment: UserMfa, code: string): Promise<boolean> {
    try {
      const assertionResponse = JSON.parse(code);
      const credentialId = enrollment.credentialId;
      const publicKey = enrollment.publicKeyCose;

      if (!credentialId || !publicKey) return false;

      const challengeData = challengeStore.get(enrollment.id);
      if (!challengeData || challengeData.expiresAt < new Date()) {
        challengeStore.delete(enrollment.id);
        return false;
      }

      const verification = await verifyAuthenticationResponse({
        response: assertionResponse,
        expectedChallenge: challengeData.challenge,
        expectedOrigin: ORIGIN,
        expectedRPID: RP_ID,
        credential: {
          id: credentialId,
          publicKey: Buffer.from(publicKey, "base64"),
          counter: 0,
          transports: (enrollment.destination?.split(",") as AuthenticatorTransportFuture[]) ?? [],
        },
      });

      challengeStore.delete(enrollment.id);
      return verification.verified;
    } catch {
      return false;
    }
  }
}