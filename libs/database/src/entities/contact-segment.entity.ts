/**
 * ContactSegmentEntity — saved audience filter definitions for reuse across campaigns.
 *
 * TABLE: contact_segments
 *
 * Users create segments from contact filters (name contains X, tags include Y, etc.)
 * and reuse them when creating campaigns instead of rebuilding conditions each time.
 */

import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from "typeorm";

/** SegmentFilter shape: { conditions: (FilterCondition|FilterGroup)[], logic: 'AND'|'OR' } */
type SegmentFilterJson = Record<string, unknown>;

@Entity("contact_segments")
@Index(["tenantId"])
export class ContactSegmentEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "varchar", length: 50 })
  tenantId: string;

  @Column({ type: "varchar", length: 255 })
  name: string;

  @Column({ type: "text", nullable: true })
  description: string | null;

  /** Filter rules matching SegmentFilter shape (FilterGroup with conditions + logic). */
  @Column("jsonb")
  filter: SegmentFilterJson;

  /** Cached contact count — refreshed on create/update. */
  @Column({ type: "int", default: 0 })
  contactCount: number;

  @Column({ type: "timestamptz", nullable: true })
  lastCountedAt: Date | null;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt: Date;
}
