/**
 * Campaign schedule entity -- recurring campaign configuration.
 *
 * Used by the CampaignScheduler cron job to trigger campaigns
 * on a recurring basis (e.g. daily digest, weekly report).
 * One-time scheduled campaigns use BullMQ delayed jobs instead.
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
import { CampaignEntity } from "./campaign.entity";

@Entity("campaign_schedules")
@Index(["tenantId", "isActive"])
@Index(["nextRunAt"])
export class CampaignScheduleEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column("uuid")
  campaignId: string;

  @ManyToOne(() => CampaignEntity)
  @JoinColumn({ name: "campaignId" })
  campaign: CampaignEntity;

  @Column({ type: "varchar", length: 50 })
  tenantId: string;

  /** Standard cron expression (e.g. '0 9 * * 1' for every Monday at 9am). */
  @Column({ type: "varchar", length: 100, nullable: true })
  cronExpression: string | null;

  /** Next scheduled execution time. Updated after each run. */
  @Column({ type: "timestamptz" })
  nextRunAt: Date;

  @Column({ type: "timestamptz", nullable: true })
  lastRunAt: Date | null;

  @Column({ type: "boolean", default: true })
  isActive: boolean;

  /** Maximum number of runs. null = unlimited. */
  @Column({ type: "int", nullable: true })
  maxRuns: number | null;

  @Column({ type: "int", default: 0 })
  runCount: number;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt: Date;
}
