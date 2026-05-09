import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { AlertScope } from './alert.enums.js';

@Entity('alert_triggers')
export class AlertTrigger {
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
  type: string;

  @Column('jsonb')
  parameters: any;

  @Column({ default: true })
  enabled: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
