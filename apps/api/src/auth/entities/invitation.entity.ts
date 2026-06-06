import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  BaseEntity,
  type Relation,
} from 'typeorm';

import { Role } from './role.entity.js';

@Entity('invitations')
export class Invitation extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  token: string;

  @Column()
  username: string;

  @ManyToOne(() => Role, { eager: true, onDelete: 'RESTRICT' })
  role: Relation<Role>;

  @Column()
  expiresAt: Date;

  @Column({ default: false })
  accepted: boolean;

  @CreateDateColumn()
  createdAt: Date;
}