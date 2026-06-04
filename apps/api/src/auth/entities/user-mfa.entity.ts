import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn, BaseEntity, type Relation } from 'typeorm';
import { User } from './user.entity.js';
import { MfaConfig } from './mfa-config.entity.js';
import { MfaType } from '../types/mfa-method-settings.types.js';

@Entity('user_mfa_enrollments')
export class UserMfa extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({type: "uuid"})
  userId: string

  @ManyToOne(() => User, (user) => user.mfaEnrollments, { onDelete: 'CASCADE' })
  user: Relation<User>;

  @ManyToOne(() => MfaConfig, { onDelete: 'CASCADE' })
  mfaConfig: Relation<MfaConfig>;

  @Column({ type: 'text' })
  type: MfaType;

  @Column({ nullable: true, select: false })
  secret?: string;

  @Column({ nullable: true })
  destination?: string;

  @Column({ nullable: true, name: 'credential_id' })
  credentialId?: string;

  @Column({ nullable: true, name: 'public_key_cose' })
  publicKeyCose?: string;

  @Column({ default: false })
  verified: boolean;

  @Column({ default: true })
  enabled: boolean;

  @Column({ nullable: true, name: 'last_used_at' })
  lastUsedAt?: Date;

  @Column({ type: 'simple-array', nullable: true, name: 'backup_codes' })
  backupCodes?: string[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}