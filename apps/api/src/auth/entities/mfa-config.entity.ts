import { Entity, PrimaryGeneratedColumn, Column, OneToMany, CreateDateColumn, UpdateDateColumn, BaseEntity, type Relation } from 'typeorm';
import { AuthMethod } from './auth-method.entity.js';
import { MfaType } from '../types/mfa-method-settings.types.js';

@Entity('mfa_configs')
export class MfaConfig extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  type: MfaType;

  @Column()
  name: string;

  @Column({ default: true })
  enabled: boolean;

  @Column({ type: 'json' })
  settings: Record<string, any>;

  @OneToMany(() => AuthMethod, (authMethod) => authMethod.mfaConfig)
  authMethods: Relation<AuthMethod[]>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}