import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, BaseEntity, type Relation } from 'typeorm';
import { AlertTrigger } from '../alert-trigger.entity.js';
import { AlertIntegration } from './integration.entity.js';

@Entity('trigger_integrations')
export class TriggerIntegration extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  triggerId: string;

  @ManyToOne(() => AlertTrigger, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'triggerId' })
  trigger: Relation<AlertTrigger>;

  @Column()
  integrationId: string;

  @ManyToOne(() => AlertIntegration, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'integrationId' })
  integration: Relation<AlertIntegration>;

  @CreateDateColumn()
  createdAt: Date;
}