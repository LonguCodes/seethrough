import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  BaseEntity,
  type Relation,
} from 'typeorm';
import { Session } from './session.entity.js';
import { Role } from './role.entity.js';

@Entity('users')
export class User extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  username: string;

  @Column({ select: false })
  password: string;

  @ManyToOne(() => Role, { eager: true, onDelete: 'RESTRICT' })
  role: Relation<Role>;

  @OneToMany(() => Session, (session) => session.user)
  sessions: Relation<Session[]>;
}