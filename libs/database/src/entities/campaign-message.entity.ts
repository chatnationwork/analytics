/**
 * Campaign message entity -- per-recipient delivery log.
 *
 * One row per contact per campaign. Tracks the full delivery lifecycle:
 * pending -> queued -> sent -> delivered -> read (or failed at any point).
 *
 * Status updates come from:
 * - SendWorker: pending -> queued -> sent (or failed)
 * - WhatsApp webhook: sent -> delivered -> read
 */

import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { CampaignEntity } from "./campaign.entity";
import { ContactEntity } from "./contact.entity";

export enum CampaignMessageStatus {
  PENDING = "pending",
  QUEUED = "queued",
  SENT = "sent",
  DELIVERED = "delivered",
  READ = "read",
  FAILED = "failed",
}

@Entity("campaign_messages")
@Index(["campaignId"])
@Index(["tenantId", "campaignId"])
@Index(["contactId"])
@Index(["status"])
@Index(["waMessageId"])
export class CampaignMessageEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column("uuid")
  campaignId: string;

  @ManyToOne(() => CampaignEntity)
  @JoinColumn({ name: "campaignId" })
  campaign: CampaignEntity;

  @Column({ type: "varchar", length: 50 })
  tenantId: string;

  /** FK to contacts.id (UUID PK). */
  @Column("uuid")
  contactId: string;

  @ManyToOne(() => ContactEntity)
  @JoinColumn({ name: "contactId" })
  contact: ContactEntity;

  /** Denormalized phone number for quick access in the send worker (avoids join). */
  @Column({ type: "varchar", length: 20 })
  recipientPhone: string;

  @Column({
    type: "enum",
    enum: CampaignMessageStatus,
    default: CampaignMessageStatus.PENDING,
  })
  status: CampaignMessageStatus;

  /** WhatsApp message ID from API response (wamid). Used for webhook status matching. */
  @Column({ type: "varchar", length: 100, nullable: true })
  waMessageId: string | null;

  @Column("text", { nullable: true })
  errorMessage: string | null;

  @Column({ type: "varchar", length: 50, nullable: true })
  errorCode: string | null;

  @Column({ type: "int", default: 0 })
  attempts: number;

  /** Whether this message is business-initiated (out-of-window, counts against tier). */
  @Column({ type: "boolean", default: true })
  isBusinessInitiated: boolean;

  @Column({ type: "timestamptz", nullable: true })
  sentAt: Date | null;

  @Column({ type: "timestamptz", nullable: true })
  deliveredAt: Date | null;

  @Column({ type: "timestamptz", nullable: true })
  readAt: Date | null;

  @Column({ type: "timestamptz", nullable: true })
  failedAt: Date | null;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date;
}
