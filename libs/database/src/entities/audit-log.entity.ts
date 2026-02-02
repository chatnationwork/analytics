/**
 * Audit log – system-wide audit trail (login, config, chat lifecycle, etc.).
 * Written directly from the backend; not via the collector.
 */

import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
} from "typeorm";

export type AuditActorType = "user" | "system" | "api_key";

@Entity("audit_log")
@Index(["tenantId", "createdAt"])
@Index(["tenantId", "action"])
@Index(["actorId", "createdAt"])
export class AuditLogEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ length: 50 })
  tenantId: string;

  /** Who performed the action (user id, or null for system) */
  @Column({ type: "varchar", length: 36, nullable: true })
  actorId: string | null;

  @Column({ type: "varchar", length: 20 })
  actorType: AuditActorType;

  /** Action identifier, e.g. auth.login, config.team.updated, chat.session.assigned */
  @Column({ length: 100 })
  action: string;

  /** Resource type, e.g. team, session, role */
  @Column({ type: "varchar", length: 50, nullable: true })
  resourceType: string | null;

  @Column({ type: "varchar", length: 100, nullable: true })
  resourceId: string | null;

  @Column("jsonb", { nullable: true })
  details: Record<string, unknown> | null;

  @Column({ type: "varchar", length: 45, nullable: true })
  ip: string | null;

  @Column({ type: "text", nullable: true })
  userAgent: string | null;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date;
}
