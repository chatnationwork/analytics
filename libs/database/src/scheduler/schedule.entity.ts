
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from "typeorm";
import { ScheduleStatus } from "./schedule.types";

@Entity("schedules")
@Index(["tenantId", "status"])
@Index(["nextRunAt"])
@Index(["jobType"])
export class ScheduleEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "varchar", length: 50 })
  tenantId: string;

  /**
   * The type of job to execute (e.g., "campaign.execute", "survey.reminder").
   * Modules register handlers for specific job types.
   */
  @Column({ type: "varchar", length: 100 })
  jobType: string;

  /** Arbitrary payload passed to the job handler. */
  @Column("jsonb")
  jobPayload: Record<string, unknown>;

  /** Standard cron expression (e.g. '0 9 * * 1'). Null for one-time schedules. */
  @Column({ type: "varchar", length: 100, nullable: true })
  cronExpression: string | null;

  /** 
   * For one-time schedules: when to run.
   * For recurring schedules: the *first* run time (optional).
   */
  @Column({ type: "timestamptz", nullable: true })
  scheduledAt: Date | null;

  /** Next scheduled execution time. Updated after each run. */
  @Column({ type: "timestamptz" })
  nextRunAt: Date;

  @Column({ type: "timestamptz", nullable: true })
  lastRunAt: Date | null;

  @Column({
    type: "enum",
    enum: ScheduleStatus,
    default: ScheduleStatus.ACTIVE,
  })
  status: ScheduleStatus;

  /** Maximum number of runs. null = unlimited. */
  @Column({ type: "int", nullable: true })
  maxRuns: number | null;

  @Column({ type: "int", default: 0 })
  runCount: number;

  /** Optional context/metadata (e.g. source module, reference IDs). */
  @Column("jsonb", { nullable: true })
  metadata: Record<string, unknown> | null;

  /** User or system identifier who created this schedule. */
  @Column({ type: "varchar", length: 100, nullable: true })
  createdBy: string | null;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt: Date;
}
