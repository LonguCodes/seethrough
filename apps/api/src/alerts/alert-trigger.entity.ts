import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, BaseEntity } from 'typeorm';

import { AlertScope } from './alert.enums.js';

@Entity('alert_triggers')
export class AlertTrigger extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({
    type: 'text',
    default: AlertScope.CLUSTER,
  })
  scope: AlertScope;

  @Column({ nullable: true })
  scopeValue: string;

  @Column()
  targetType: string;

  @Column()
  targetProperty: string;

  @Column()
  conditionType: string;

  @Column('jsonb')
  conditionValue: any;

  @Column({ nullable: true })
  messageTemplate: string;

  @Column({ default: true })
  enabled: boolean;

  @Column({ default: 0 })
  lookbackSeconds: number;

  @Column({ default: true })
  autoResolveEnabled: boolean;

  @Column({ default: 0 })
  autoResolveLookbackSeconds: number;

  @Column({ default: 0 })
  noRetriggerSeconds: number;

  @Column({ nullable: true, type: 'timestamp' })
  lastTriggeredAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}