import {Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, BaseEntity, type Relation} from 'typeorm';

import { User } from './user.entity.js';

@Entity('sessions')
export class Session extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  token: string;

  @Column()
  expiresAt: Date;

  @ManyToOne(() => User, (user) => user.sessions, { onDelete: 'CASCADE' })
  user: Relation<User>;

  @CreateDateColumn()
  createdAt: Date;
}