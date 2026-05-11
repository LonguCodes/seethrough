import { Entity, PrimaryGeneratedColumn, Column, OneToMany, type Relation } from 'typeorm';
import { Session } from './session.entity.js';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  username: string;

  @Column({ select: false })
  password: string;

  @Column({ default: 'admin' })
  role: string;

  @OneToMany(() => Session, (session) => session.user)
  sessions: Relation<Session[]>;
}
