import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { AlertTrigger } from './alert-trigger.entity.js';
import { AlertSeverity, AlertStatus } from './alert.enums.js';

@Entity('alerts')
export class Alert {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  message: string;

  @Column({
    type: 'text',
    default: AlertSeverity.WARNING,
  })
  severity: AlertSeverity;

  @Column({
    type: 'text',
    default: AlertStatus.ACTIVE,
  })
  status: AlertStatus;

  @Column('jsonb', { nullable: true })
  details: any;

  @ManyToOne(() => AlertTrigger, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'triggerId' })
  trigger: AlertTrigger;

  @Column({ nullable: true })
  triggerId: string;

  @Column()
  triggerType: string;

  @Column({ default: false })
  autoResolved: boolean;

  @Column({ nullable: true, type: 'timestamp' })
  lastMatchedAt: Date;

  @Column({ nullable: true })
  resolvedAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}