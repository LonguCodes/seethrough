import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, BaseEntity } from 'typeorm';

export type IntegrationType = 'teams' | 'slack' | 'discord' | 'webhook';

@Entity('alert_integrations')
export class AlertIntegration extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({type: "text"})
  type: IntegrationType;

  @Column('jsonb')
  config: Record<string, any>;

  @Column({ default: false })
  sendAllAlerts: boolean;

  @Column({ default: true })
  enabled: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}