/**
 * =============================================================================
 * SESSION TAKEOVER REQUEST ENTITY
 * =============================================================================
 *
 * One-time request when a user tries to log in from a new device while already
 * having an active session. After identity verification (2FA code or email link),
 * we replace the stored session and issue a new JWT.
 *
 * TABLE: session_takeover_requests
 */

import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { UserEntity } from "./user.entity";

export type SessionTakeoverMethod = "2fa" | "email";

@Entity("session_takeover_requests")
@Index(["expiresAt"])
export class SessionTakeoverRequestEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column("uuid")
  userId: string;

  @ManyToOne(() => UserEntity, { onDelete: "CASCADE" })
  @JoinColumn({ name: "userId" })
  user: UserEntity;

  @Column("varchar", { length: 10 })
  method: SessionTakeoverMethod;

  /** 6-digit code for method 2fa */
  @Column("varchar", { length: 10 }, { nullable: true })
  code: string | null;

  /** SHA-256 hash of token sent in email link for method email */
  @Column("varchar", { length: 64 }, { nullable: true })
  emailTokenHash: string | null;

  @Column({ type: "timestamptz" })
  expiresAt: Date;
}
