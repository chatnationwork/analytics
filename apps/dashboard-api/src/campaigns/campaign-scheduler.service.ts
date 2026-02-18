/**
 * CampaignSchedulerService -- cron job that checks for recurring campaigns
 * and one-time scheduled campaigns that are due to execute.
 */

import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { InjectRepository } from "@nestjs/typeorm";
import { LessThanOrEqual, Repository } from "typeorm";
import { CampaignScheduleEntity, CampaignEntity, CampaignStatus } from "@lib/database";
import { CampaignOrchestratorService } from "./campaign-orchestrator.service";

@Injectable()
export class CampaignSchedulerService {
  private readonly logger = new Logger(CampaignSchedulerService.name);

  constructor(
    @InjectRepository(CampaignScheduleEntity)
    private readonly scheduleRepo: Repository<CampaignScheduleEntity>,
    @InjectRepository(CampaignEntity)
    private readonly campaignRepo: Repository<CampaignEntity>,
    private readonly orchestrator: CampaignOrchestratorService,
  ) {}

  /**
   * Check for recurring schedules that are due.
   * Runs every 60 seconds.
   */
  @Cron("*/60 * * * * *")
  async processRecurringSchedules(): Promise<void> {
    try {
      const dueSchedules = await this.scheduleRepo.find({
        where: {
          isActive: true,
          nextRunAt: LessThanOrEqual(new Date()),
        },
      });

      for (const schedule of dueSchedules) {
        try {
          // Check maxRuns
          if (
            schedule.maxRuns !== null &&
            schedule.runCount >= schedule.maxRuns
          ) {
            schedule.isActive = false;
            await this.scheduleRepo.save(schedule);
            this.logger.log(
              `Schedule ${schedule.id} reached maxRuns (${schedule.maxRuns}), deactivating`,
            );
            continue;
          }

          await this.orchestrator.execute(
            schedule.tenantId,
            schedule.campaignId,
          );

          // Update schedule
          schedule.lastRunAt = new Date();
          schedule.runCount += 1;
          schedule.nextRunAt = this.computeNextRun(schedule.cronExpression);
          await this.scheduleRepo.save(schedule);
        } catch (error: unknown) {
          const errMsg =
            error instanceof Error ? error.message : String(error);
          this.logger.error(
            `Failed to execute schedule ${schedule.id}: ${errMsg}`,
          );
        }
      }
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Scheduler cron failed: ${errMsg}`);
    }
  }

  /**
   * Check for one-time scheduled campaigns that are due.
   * These are campaigns with scheduledAt set and status = 'scheduled'.
   * Runs every 60 seconds.
   */
  @Cron("0 */1 * * * *")
  async processScheduledCampaigns(): Promise<void> {
    try {
      const dueCampaigns = await this.campaignRepo
        .createQueryBuilder("c")
        .where("c.status = :status", { status: CampaignStatus.SCHEDULED })
        .andWhere("c.scheduledAt <= :now", { now: new Date() })
        .getMany();

      for (const campaign of dueCampaigns) {
        try {
          await this.orchestrator.execute(campaign.tenantId, campaign.id);
        } catch (error: unknown) {
          const errMsg =
            error instanceof Error ? error.message : String(error);
          this.logger.error(
            `Failed to execute scheduled campaign ${campaign.id}: ${errMsg}`,
          );
        }
      }
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Scheduled campaigns cron failed: ${errMsg}`);
    }
  }

  /**
   * Compute the next run time from a cron expression.
   * Uses a simple approach: next run = now + interval parsed from cron.
   * For production, consider using a cron parser library like 'cron-parser'.
   */
  private computeNextRun(cronExpression: string | null): Date {
    // Fallback: 24 hours from now if cron is null or can't be parsed
    const fallback = new Date(Date.now() + 24 * 60 * 60 * 1000);

    if (!cronExpression) return fallback;

    // For now, return fallback. A cron-parser library should be added
    // for accurate cron expression evaluation.
    // TODO: Add cron-parser dependency for accurate next-run computation
    return fallback;
  }
}
