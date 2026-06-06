import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  BaseEntity,
  type Relation,
} from "typeorm";

import { Role } from "./role.entity.js";
import { Session } from "./session.entity.js";
import { UserMfa } from "./user-mfa.entity.js";

@Entity("users")
export class User extends BaseEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ unique: true })
  username: string;

  @Column({ select: false })
  password: string;

  @Column({ type: "uuid" })
  roleId: string;

  @ManyToOne(() => Role, { eager: true, onDelete: "RESTRICT" })
  role: Relation<Role>;

  @OneToMany(() => Session, (session) => session.user)
  sessions: Relation<Session[]>;

  @OneToMany(() => UserMfa, (mfa) => mfa.user)
  mfaEnrollments: Relation<UserMfa[]>;
}
