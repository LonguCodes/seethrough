import { Entity, PrimaryGeneratedColumn, Column, BaseEntity, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum SsoType {
  SAML = 'saml',
  OIDC = 'oidc',
}

@Entity('sso_configs')
export class SsoConfig extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'enum', enum: SsoType })
  type: SsoType;

  @Column({ default: true })
  enabled: boolean;

  @Column({ default: false, name: 'allow_only_sso' })
  allowOnlySso: boolean;

  @Column({ default: false, name: 'auto_create_users' })
  autoCreateUsers: boolean;

  @Column({ default: 'viewer', name: 'default_role' })
  defaultRole: string;

  // SAML-specific fields
  @Column({ nullable: true, name: 'saml_entry_point' })
  samlEntryPoint: string;

  @Column({ nullable: true, name: 'saml_issuer' })
  samlIssuer: string;

  @Column({ type: 'text', nullable: true, name: 'saml_cert' })
  samlCert: string;

  // OIDC-specific fields
  @Column({ nullable: true, name: 'oidc_issuer_url' })
  oidcIssuerUrl: string;

  @Column({ nullable: true, name: 'oidc_client_id' })
  oidcClientId: string;

  @Column({ type: 'text', nullable: true, name: 'oidc_client_secret', select: false })
  oidcClientSecret: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}