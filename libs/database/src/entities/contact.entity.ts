/**
 * Contact entity – people who have sent at least one message (message.received).
 * Populated when we process message.received (collector/processor), not derived from analytics.
 *
 * PK: UUID `id` (used by new module FKs: campaigns, events, surveys, etc.)
 * Unique: (tenantId, contactId) – all existing code queries by this pair.
 */

import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from "typeorm";

@Entity("contacts")
@Index(["tenantId", "contactId"], { unique: true })
@Index(["tenantId", "lastSeen"])
export class ContactEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "varchar", length: 50 })
  tenantId: string;

  /** Phone number or external identifier (e.g. WhatsApp number, digits-only). */
  @Column({ type: "varchar", length: 100 })
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

  /** Tags for manual segmentation (e.g. ['vip', 'paid', 'event-2024']). */
  @Column("text", { array: true, default: () => "'{}'" })
  tags: string[];

  /** Payment state for campaign audience filtering. */
  @Column({ type: "varchar", length: 20, nullable: true })
  paymentStatus: string | null;

  /** WhatsApp Business API messaging consent. Defaults to true for existing contacts. */
  @Column({ type: "boolean", default: true })
  optedIn: boolean;

  /** When messaging consent was given. */
  @Column({ type: "timestamptz", nullable: true })
  optedInAt: Date | null;

  /** When set, contact is deactivated (hidden from list/export; admins can deactivate). */
  @Column({ type: "timestamptz", nullable: true })
  deactivatedAt: Date | null;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt: Date;
}
