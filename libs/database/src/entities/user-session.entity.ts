/**
 * =============================================================================
 * USER SESSION ENTITY
 * =============================================================================
 *
 * Stores the single active session id per user for "single login" enforcement.
 * One row per user; updated on login and cleared on logout.
 *
 * TABLE: user_sessions
 */

import { Entity, Column, PrimaryColumn, UpdateDateColumn } from "typeorm";

@Entity("user_sessions")
export class UserSessionEntity {
  @PrimaryColumn("uuid")
  userId: string;

  /** Current valid session id; included in JWT payload. */
  @Column("uuid")
  sessionId: string;

  /** Refreshed on every authenticated API call; used to enforce inactivity timeout. */
  @Column({ type: "timestamptz", default: () => "now()" })
  lastActivityAt: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt: Date;
}
