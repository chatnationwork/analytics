/**
 * SchedulerService — the core of the reusable scheduling engine.
 *
 * This service provides a module-agnostic scheduling system using a
 * callback registry pattern. Any NestJS module can register a handler
 * for a specific `jobType`, and the scheduler's cron poller will invoke
 * the correct handler when a schedule is due.
 *
 * Responsibilities:
 *  - CRUD operations on ScheduleEntity rows
 *  - Handler registration (registerHandler / getHandler)
 *  - Cron-based polling for due schedules (every 30 seconds)
 *  - Accurate next-run computation via cron-parser
 */

import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { InjectRepository } from "@nestjs/typeorm";
import { LessThanOrEqual, Repository, In } from "typeorm";
import * as parser from "cron-parser";

import { ScheduleEntity } from "./schedule.entity";
import {
  ScheduleStatus,
  ScheduleJobHandler,
  CreateScheduleDto,
  UpdateScheduleDto,
} from "./schedule.types";

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  /**
   * Registry of job handlers keyed by jobType.
   * Modules call registerHandler() at startup to wire themselves in.
   */
  private readonly handlers = new Map<string, ScheduleJobHandler>();

  constructor(
    @InjectRepository(ScheduleEntity)
    private readonly scheduleRepo: Repository<ScheduleEntity>,
  ) {}

  // ─── Handler Registry ───────────────────────────────────────────────

  /**
   * Register a handler function for a given jobType.
   * Typically called from a service's OnModuleInit lifecycle hook.
   */
  registerHandler(jobType: string, handler: ScheduleJobHandler): void {
    if (this.handlers.has(jobType)) {
      this.logger.warn(`Handler for jobType "${jobType}" is being overwritten`);
    }
    this.handlers.set(jobType, handler);
    this.logger.log(`Registered handler for jobType: ${jobType}`);
  }

  /**
   * Look up a handler by jobType. Returns undefined if none registered.
   */
  getHandler(jobType: string): ScheduleJobHandler | undefined {
    return this.handlers.get(jobType);
  }

  // ─── CRUD ───────────────────────────────────────────────────────────

  /**
   * Create a new schedule. Computes nextRunAt from cron or scheduledAt.
   */
  async createSchedule(dto: CreateScheduleDto): Promise<ScheduleEntity> {
    const nextRunAt = this.resolveNextRunAt(
      dto.cronExpression ?? null,
      dto.scheduledAt ? new Date(dto.scheduledAt) : null,
    );

    const entity = this.scheduleRepo.create({
      tenantId: dto.tenantId,
      jobType: dto.jobType,
      jobPayload: dto.jobPayload,
      cronExpression: dto.cronExpression ?? null,
      scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
      nextRunAt,
      status: ScheduleStatus.ACTIVE,
      maxRuns: dto.maxRuns ?? null,
      runCount: 0,
      metadata: dto.metadata ?? null,
      createdBy: dto.createdBy ?? null,
    });

    const saved = await this.scheduleRepo.save(entity);
    this.logger.log(
      `Created schedule ${saved.id} (jobType=${dto.jobType}, nextRunAt=${nextRunAt.toISOString()})`,
    );
    return saved;
  }

  /**
   * Update an existing schedule's configuration.
   * Recomputes nextRunAt if cron or scheduledAt changed.
   */
  async updateSchedule(
    id: string,
    dto: UpdateScheduleDto,
  ): Promise<ScheduleEntity> {
    const schedule = await this.scheduleRepo.findOneByOrFail({ id });

    if (dto.cronExpression !== undefined) {
      schedule.cronExpression = dto.cronExpression ?? null;
    }
    if (dto.scheduledAt !== undefined) {
      schedule.scheduledAt = dto.scheduledAt ? new Date(dto.scheduledAt) : null;
    }
    if (dto.jobPayload !== undefined) {
      schedule.jobPayload = dto.jobPayload;
    }
    if (dto.maxRuns !== undefined) {
      schedule.maxRuns = dto.maxRuns ?? null;
    }
    if (dto.status !== undefined) {
      schedule.status = dto.status;
    }
    if (dto.metadata !== undefined) {
      schedule.metadata = dto.metadata ?? null;
    }

    // Recompute nextRunAt if scheduling parameters changed
    if (dto.cronExpression !== undefined || dto.scheduledAt !== undefined) {
      schedule.nextRunAt = this.resolveNextRunAt(
        schedule.cronExpression,
        schedule.scheduledAt,
      );
    }

    return this.scheduleRepo.save(schedule);
  }

  /** Pause an active schedule. */
  async pauseSchedule(id: string): Promise<void> {
    await this.scheduleRepo.update(id, { status: ScheduleStatus.PAUSED });
    this.logger.log(`Paused schedule ${id}`);
  }

  /** Resume a paused schedule. Recomputes nextRunAt. */
  async resumeSchedule(id: string): Promise<void> {
    const schedule = await this.scheduleRepo.findOneByOrFail({ id });
    schedule.status = ScheduleStatus.ACTIVE;
    schedule.nextRunAt = this.resolveNextRunAt(
      schedule.cronExpression,
      schedule.scheduledAt,
    );
    await this.scheduleRepo.save(schedule);
    this.logger.log(`Resumed schedule ${id}`);
  }

  /** Cancel a schedule permanently. */
  async cancelSchedule(id: string): Promise<void> {
    await this.scheduleRepo.update(id, {
      status: ScheduleStatus.CANCELLED,
    });
    this.logger.log(`Cancelled schedule ${id}`);
  }

  /** Find a schedule by ID. */
  async findById(id: string): Promise<ScheduleEntity | null> {
    return this.scheduleRepo.findOneBy({ id });
  }

  /** Find all schedules for a tenant, optionally filtered by jobType. */
  async findByTenant(
    tenantId: string,
    jobType?: string,
  ): Promise<ScheduleEntity[]> {
    const where: Record<string, unknown> = { tenantId };
    if (jobType) {
      where["jobType"] = jobType;
    }
    return this.scheduleRepo.find({ where, order: { createdAt: "DESC" } });
  }

  // ─── Cron Poller ────────────────────────────────────────────────────

  /**
   * Poll for due schedules every 30 seconds.
   * Finds all active schedules whose nextRunAt <= now, executes their
   * registered handler, updates run metadata, and marks one-time
   * schedules as completed.
   */
  @Cron("*/30 * * * * *")
  async processDueSchedules(): Promise<void> {
    try {
      const dueSchedules = await this.scheduleRepo.find({
        where: {
          status: ScheduleStatus.ACTIVE,
          nextRunAt: LessThanOrEqual(new Date()),
        },
      });

      if (dueSchedules.length === 0) return;

      this.logger.debug(`Found ${dueSchedules.length} due schedule(s)`);

      for (const schedule of dueSchedules) {
        await this.executeSchedule(schedule);
      }
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Scheduler poll failed: ${errMsg}`);
    }
  }

  // ─── Internal ───────────────────────────────────────────────────────

  /**
   * Execute a single schedule: look up the handler *by jobType*, call it,
   * then update run metadata (runCount, lastRunAt, nextRunAt, status).
   */
  private async executeSchedule(schedule: ScheduleEntity): Promise<void> {
    const handler = this.handlers.get(schedule.jobType);
    if (!handler) {
      this.logger.warn(
        `No handler registered for jobType "${schedule.jobType}" — skipping schedule ${schedule.id}`,
      );
      return;
    }

    try {
      // Check maxRuns before execution
      if (schedule.maxRuns !== null && schedule.runCount >= schedule.maxRuns) {
        schedule.status = ScheduleStatus.COMPLETED;
        await this.scheduleRepo.save(schedule);
        this.logger.log(
          `Schedule ${schedule.id} reached maxRuns (${schedule.maxRuns}), marking completed`,
        );
        return;
      }

      await handler(schedule.tenantId, schedule.jobPayload, schedule.id);

      // Update run metadata
      schedule.lastRunAt = new Date();
      schedule.runCount += 1;

      // Determine if this is a recurring or one-time schedule
      if (schedule.cronExpression) {
        // Recurring: compute next run from cron
        schedule.nextRunAt = this.computeNextRun(schedule.cronExpression);
      } else {
        // One-time: mark as completed
        schedule.status = ScheduleStatus.COMPLETED;
      }

      // Check maxRuns after execution
      if (schedule.maxRuns !== null && schedule.runCount >= schedule.maxRuns) {
        schedule.status = ScheduleStatus.COMPLETED;
        this.logger.log(
          `Schedule ${schedule.id} reached maxRuns after execution`,
        );
      }

      await this.scheduleRepo.save(schedule);
      this.logger.log(
        `Executed schedule ${schedule.id} (jobType=${schedule.jobType}, run #${schedule.runCount})`,
      );
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to execute schedule ${schedule.id}: ${errMsg}`);

      // Record the failure but don't deactivate — let it retry on next poll
      schedule.lastRunAt = new Date();
      await this.scheduleRepo.save(schedule);
    }
  }

  /**
   * Compute the next run time from a cron expression using cron-parser.
   * Falls back to 24 hours from now if parsing fails.
   */
  computeNextRun(cronExpression: string): Date {
    try {
      const interval = parser.CronExpressionParser.parse(cronExpression);
      return interval.next().toDate();
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Failed to parse cron "${cronExpression}": ${errMsg}. Falling back to 24h.`,
      );
      return new Date(Date.now() + 24 * 60 * 60 * 1000);
    }
  }

  /**
   * Determine the initial nextRunAt for a new or updated schedule.
   * Uses cronExpression if present, otherwise falls back to scheduledAt,
   * or defaults to "now" (immediate execution).
   */
  private resolveNextRunAt(
    cronExpression: string | null,
    scheduledAt: Date | null,
  ): Date {
    if (cronExpression) {
      return this.computeNextRun(cronExpression);
    }
    if (scheduledAt) {
      return scheduledAt;
    }
    // Immediate execution
    return new Date();
  }
}
