/**
 * Campaign entity -- a broadcast operation targeting a list of contacts.
 *
 * Any module (events, surveys, content, hypecards) or manual UI can create
 * a campaign. The campaign stores the audience filter, message template,
 * scheduling config, and aggregate delivery stats.
 */

import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { UserEntity } from "./user.entity";
import { TemplateEntity } from "./template.entity";

export enum CampaignType {
  MANUAL = "manual",
  EVENT_TRIGGERED = "event_triggered",
  SCHEDULED = "scheduled",
  MODULE_INITIATED = "module_initiated",
}

export enum CampaignStatus {
  DRAFT = "draft",
  SCHEDULED = "scheduled",
  RUNNING = "running",
  PAUSED = "paused",
  COMPLETED = "completed",
  FAILED = "failed",
  CANCELLED = "cancelled",
}

@Entity("campaigns")
@Index(["tenantId", "status"])
@Index(["tenantId", "createdAt"])
@Index(["tenantId", "sourceModule"])
export class CampaignEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "varchar", length: 50 })
  tenantId: string;

  @Column({ type: "varchar", length: 255 })
  name: string;

  @Column({ type: "enum", enum: CampaignType })
  type: CampaignType;

  @Column({
    type: "enum",
    enum: CampaignStatus,
    default: CampaignStatus.DRAFT,
  })
  status: CampaignStatus;

  /** Which module created this campaign (events, surveys, content, hypecards, manual). */
  @Column({ type: "varchar", length: 50, nullable: true })
  sourceModule: string | null;

  /** Reference ID from the source module (e.g. eventId, surveyId). */
  @Column({ type: "varchar", length: 100, nullable: true })
  sourceReferenceId: string | null;

  /**
   * WhatsApp message payload to send to each recipient.
   * Matches the WhatsAppSendPayload type (text, image, video, template, etc.).
   */
  @Column("jsonb")
  messageTemplate: Record<string, unknown>;

  /**
   * Audience filter rules for selecting contacts.
   * Shape: { conditions: FilterCondition[], logic: 'AND' | 'OR' }
   */
  @Column("jsonb", { nullable: true })
  audienceFilter: Record<string, unknown> | null;

  /** Optional reference to a saved segment — filter is copied inline; this is for traceability. */
  @Column({ type: "uuid", nullable: true })
  segmentId: string | null;
  
  /** Reference to a pre-defined WhatsApp template. */
  @Column({ type: "uuid", nullable: true })
  templateId: string | null;

  @ManyToOne(() => TemplateEntity)
  @JoinColumn({ name: "templateId" })
  template: TemplateEntity;

  /** User-entered values for template variables (e.g. {{1}}, {{2}}). */
  @Column("jsonb", { nullable: true })
  templateParams: Record<string, string> | null;

  /** Snapshot of audience size when campaign was sent. */
  @Column({ type: "int", default: 0 })
  recipientCount: number;

  /** For one-time scheduled campaigns. */
  @Column({ type: "timestamptz", nullable: true })
  scheduledAt: Date | null;

  @Column({ type: "timestamptz", nullable: true })
  startedAt: Date | null;

  @Column({ type: "timestamptz", nullable: true })
  completedAt: Date | null;

  /** Estimated delivery completion time (computed from audience size and rate limit). */
  @Column({ type: "timestamptz", nullable: true })
  estimatedCompletionAt: Date | null;

  /** Predefined trigger name for event-triggered campaigns. */
  @Column({ type: "varchar", length: 50, nullable: true })
  triggerType: string | null;

  /** Trigger-specific config (e.g. filter by eventId). */
  @Column("jsonb", { nullable: true })
  triggerConfig: Record<string, unknown> | null;

  /** Platform user who created this campaign. */
  @Column("uuid", { nullable: true })
  createdBy: string | null;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: "createdBy" })
  creator: UserEntity;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt: Date;
}
