/**
 * Entity archive - stores a JSON snapshot of deleted entities before removal.
 * Used by Danger Zone (delete user, role, team).
 */

import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
} from "typeorm";

@Entity("entity_archive")
@Index(["entityType", "entityId"])
@Index(["tenantId", "archivedAt"])
export class EntityArchiveEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ length: 20 })
  entityType: "user" | "role" | "team";

  @Column("uuid")
  entityId: string;

  @Column("uuid", { nullable: true })
  tenantId: string | null;

  @CreateDateColumn({ type: "timestamptz" })
  archivedAt: Date;

  @Column("uuid")
  archivedBy: string;

  @Column("jsonb")
  data: Record<string, unknown>;
}
