import {BadRequestException, Injectable, NotFoundException, OnModuleInit, UnauthorizedException} from '@nestjs/common';
import crypto from 'crypto';
import {UserMfa} from './entities/user-mfa.entity.js';
import {MfaConfig} from './entities/mfa-config.entity.js';
import {User} from './entities/user.entity.js';
import {AuthMethod} from './entities/auth-method.entity.js';
import {MfaStrategy} from './strategies/mfa/mfa-strategy.interface.js';
import {TotpStrategy} from './strategies/mfa/totp.strategy.js';
import {PasskeyStrategy} from './strategies/mfa/passkey.strategy.js';
import {TokenService} from "./token.service.js";

const ENCRYPTION_ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;

function getEncryptionKey(): Buffer {
  const raw = process.env.MFA_ENCRYPTION_KEY || process.env.JWT_SECRET || 'development-secret-key-change-me';
  return crypto.createHash('sha256').update(raw).digest();
}

function encryptSecret(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decryptSecret(encrypted: string): string {
  const key = getEncryptionKey();
  const parts = encrypted.split(':');
  if (parts.length !== 2) return encrypted; // handle unencrypted legacy data
  const iv = Buffer.from(parts[0], 'hex');
  const data = Buffer.from(parts[1], 'hex');
  const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, key, iv);
  const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
  return decrypted.toString('utf8');
}

export interface MfaChallenge {
  challengeToken: string;
  mfaMethodId: string;
  mfaMethodType: string;
  mfaMethodName: string;
}

const challengeStore = new Map<string, { userId: string; authMethodId: string; mfaConfigId: string; expiresAt: Date }>();

@Injectable()
export class MfaService implements OnModuleInit {
  private strategies: Map<string, MfaStrategy> = new Map();

  constructor(
    private readonly totpStrategy: TotpStrategy,
    private readonly passkeyStrategy: PasskeyStrategy,
    private readonly tokenService: TokenService,
  ) {
    this.registerStrategy(totpStrategy);
    this.registerStrategy(passkeyStrategy);
  }

  onModuleInit() {}

  registerStrategy(strategy: MfaStrategy) {
    this.strategies.set(strategy.name, strategy);
  }

  async checkMfaRequirements(authMethod: AuthMethod, userId: string): Promise<MfaChallenge | null> {
    if (!authMethod.mfaConfig || !authMethod.mfaConfig.id) return null;

    const mfaConfig = authMethod.mfaConfig ;
    if (!mfaConfig.enabled) return null;

    const userEnrollment = await UserMfa.findOne({
      where: { user: { id: userId }, mfaConfig: { id: mfaConfig.id }, enabled: true, verified: true },
    });

    if (!userEnrollment) return null;

    const challengeToken = crypto.randomBytes(32).toString('hex');
    challengeStore.set(challengeToken, {
      userId,
      authMethodId: authMethod.id,
      mfaConfigId: mfaConfig.id,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    });

    return {
      challengeToken,
      mfaMethodId: mfaConfig.id,
      mfaMethodType: mfaConfig.type,
      mfaMethodName: mfaConfig.name,
    };
  }

  async verifyMfa(challengeToken: string, type: string, code: string): Promise<{ accessToken: string; refreshToken: string }> {
    const challenge = challengeStore.get(challengeToken);
    if (!challenge || challenge.expiresAt < new Date()) {
      challengeStore.delete(challengeToken);
      throw new BadRequestException('Invalid or expired challenge token');
    }

    const user = await User.findOneBy({ id: challenge.userId });
    if (!user) throw new UnauthorizedException('User not found');

    const mfaConfig = await MfaConfig.findOneBy({ id: challenge.mfaConfigId, enabled: true });
    if (!mfaConfig) throw new BadRequestException('MFA configuration is not available');

    const enrollment = await UserMfa.createQueryBuilder('mfa')
        .addSelect(['mfa.secret'])
        .where({ user: { id: challenge.userId }, mfaConfig: { id: mfaConfig.id }, enabled: true })
        .getOne();
    if (!enrollment) throw new BadRequestException('No enrollment found for this MFA method');


    console.log(enrollment);
    // Decrypt TOTP secret for verification
    if (enrollment.type === 'totp' && enrollment.secret) {
      enrollment.secret = decryptSecret(enrollment.secret);
    }

    const strategy = this.strategies.get(type);
    if (!strategy) throw new BadRequestException(`MFA strategy '${type}' is not supported`);

    const isValid = await strategy.verify(mfaConfig, enrollment, code);
    if (!isValid) throw new UnauthorizedException('Invalid MFA code');

    enrollment.lastUsedAt = new Date();
    await enrollment.save();
    challengeStore.delete(challengeToken);

    return this.tokenService.generateTokens(user);
  }

  async enrollUser(userId: string, mfaConfigId: string): Promise<UserMfa> {
    const mfaConfig = await MfaConfig.findOneBy({ id: mfaConfigId, enabled: true });
    if (!mfaConfig) throw new NotFoundException('MFA configuration not found or disabled');

    const existing = await UserMfa.findOne({ where: { user: { id: userId }, mfaConfig: { id: mfaConfigId } } });
    if (existing) return existing;

    const enrollment = UserMfa.create({
      userId: userId,
      mfaConfig,
      type: mfaConfig.type,
      enabled: true,
      verified: false,
    });

    if (mfaConfig.type === 'totp') {
      const base32Secret = this.totpStrategy.generateSecret();
      enrollment.secret = encryptSecret(base32Secret);
    }

    return await enrollment.save();
  }

  async verifyEnrollment(userId: string, enrollmentId: string, code: string): Promise<boolean> {
    const enrollment = await UserMfa
        .createQueryBuilder()
        .addSelect('secret')
        .where({ id: enrollmentId, user: { id: userId } })
        .leftJoinAndSelect('enrollment.mfaConfig', 'mfaConfig')
        .getOne();


    if (!enrollment) throw new NotFoundException('Enrollment not found');

    const mfaConfig = enrollment.mfaConfig;
    if (!mfaConfig) throw new NotFoundException('MFA configuration not found');

    // Decrypt TOTP secret for verification
    if (mfaConfig.type === 'totp' && enrollment.secret) {
      enrollment.secret = decryptSecret(enrollment.secret);
    }

    const strategy = this.strategies.get(mfaConfig.type);
    if (!strategy) throw new BadRequestException(`MFA strategy '${mfaConfig.type}' is not supported`);

    const isValid = await strategy.verify(mfaConfig, enrollment, code);
    if (!isValid) return false;

    enrollment.verified = true;
    await enrollment.save();
    return true;
  }

  async getUserEnrollments(userId: string): Promise<Array<UserMfa & { secret?: string }>> {
    return UserMfa.find({where: {user: {id: userId}}, relations: ['mfaConfig']});
  }

  async getPasskeyRegistrationOptions(userId: string, username: string, mfaConfigId: string): Promise<any> {
    const mfaConfig = await MfaConfig.findOneBy({ id: mfaConfigId, enabled: true });
    if (!mfaConfig) throw new NotFoundException('MFA configuration not found or disabled');
    return this.passkeyStrategy.generateRegistrationOptions(userId, username, mfaConfig);
  }

  async verifyPasskeyRegistration(userId: string, mfaConfigId: string, response: any): Promise<UserMfa> {
    const credential = await this.passkeyStrategy.verifyRegistration(userId, response);
    if (!credential) throw new BadRequestException('Passkey registration verification failed');

    const mfaConfig = await MfaConfig.findOneBy({ id: mfaConfigId, enabled: true });
    if (!mfaConfig) throw new NotFoundException('MFA configuration not found or disabled');

    const enrollment = UserMfa.create({
      user: { id: userId } as any,
      mfaConfig,
      type: 'passkey' as any,
      enabled: true,
      verified: true,
      credentialId: credential.id?.toString(),
      publicKeyCose: credential.publicKey ? Buffer.from(credential.publicKey).toString('base64') : undefined,
      destination: credential.transports?.join(','),
    });

    return enrollment.save();
  }

  async getPasskeyAuthenticateOptions(challengeToken: string): Promise<any> {
    const challenge = challengeStore.get(challengeToken);
    if (!challenge || challenge.expiresAt < new Date()) {
      challengeStore.delete(challengeToken);
      throw new BadRequestException('Invalid or expired challenge token');
    }

    const mfaConfig = await MfaConfig.findOneBy({ id: challenge.mfaConfigId, enabled: true });
    if (!mfaConfig) throw new BadRequestException('Passkey MFA is not configured');

    const enrollments = await UserMfa.find({
      where: { user: { id: challenge.userId }, mfaConfig: { id: mfaConfig.id }, enabled: true, verified: true },
    });

    if (enrollments.length === 0) {
      throw new BadRequestException('No passkey enrollments found');
    }

    const options = await this.passkeyStrategy.generateAuthenticationOptions(enrollments, mfaConfig, challengeToken);
    if (!options) {
      throw new BadRequestException('Failed to generate passkey authentication options');
    }

    return options;
  }

  async removeEnrollment(userId: string, enrollmentId: string): Promise<void> {
    const enrollment = await UserMfa.findOne({ where: { id: enrollmentId, user: { id: userId } } });
    if (!enrollment) throw new NotFoundException('Enrollment not found');
    await enrollment.remove();
  }
}