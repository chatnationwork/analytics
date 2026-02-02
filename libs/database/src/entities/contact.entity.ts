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
