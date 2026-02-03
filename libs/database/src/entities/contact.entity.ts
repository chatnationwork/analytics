/**
 * Contact entity – people who have sent at least one message (message.received).
 * Populated when we process message.received (collector/processor), not derived from analytics.
 */

import {
  Entity,
  Column,
  PrimaryColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from "typeorm";

@Entity("contacts")
@Index(["tenantId", "contactId"], { unique: true })
@Index(["tenantId", "lastSeen"])
export class ContactEntity {
  /** Composite primary key: tenantId + contactId (e.g. phone number) */
  @PrimaryColumn({ length: 50 })
  tenantId: string;

  @PrimaryColumn({ length: 100 })
  contactId: string;

  @Column({ type: "varchar", length: 200, nullable: true })
  name: string | null;

  /** PIN or tax ID (e.g. KRA PIN) */
  @Column({ type: "varchar", length: 50, nullable: true })
  pin: string | null;

  /** Year of birth (e.g. 1990) */
  @Column({ type: "int", nullable: true })
  yearOfBirth: number | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  email: string | null;

  /** Extra profile fields (e.g. address, company) */
  @Column("jsonb", { nullable: true })
  metadata: Record<string, string> | null;

  @Column({ type: "timestamptz" })
  firstSeen: Date;

  @Column({ type: "timestamptz" })
  lastSeen: Date;

  @Column({ type: "int", default: 0 })
  messageCount: number;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt: Date;
}
