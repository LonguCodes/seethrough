import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn, BaseEntity, type Relation } from 'typeorm';

import { MfaConfig } from './mfa-config.entity.js';
import type { AuthMethodType } from '../types/auth-method-type.js';

@Entity('auth_methods')
export class AuthMethod extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  type: AuthMethodType;

  @Column()
  name: string;

  @Column({ default: true })
  enabled: boolean;

  @Column({ default: 0 })
  priority: number;

  @Column({ default: false, name: 'auto_create_users' })
  autoCreateUsers: boolean;

  @Column({ default: 'viewer', name: 'default_role' })
  defaultRole: string;

  @Column({ type: 'json' })
  settings: Record<string, any>;

  @ManyToOne(() => MfaConfig, (mfa) => mfa.authMethods, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'mfa_config_id' })
  mfaConfig: Relation<MfaConfig | null>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}