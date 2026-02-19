/**
 * CampaignSchedulerService — campaign-specific scheduling adapter.
 *
 * This service delegates to the generic SchedulerService from @lib/database.
 * On module init, it registers a handler for the "campaign.execute" job type.
 * When the generic scheduler fires a due schedule with that job type,
 * this handler calls the CampaignOrchestratorService to execute the campaign.
 *
 * It also handles one-time scheduled campaigns by polling for campaigns
 * with status=SCHEDULED and scheduledAt <= now.
 */

import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import {
  CampaignEntity,
  CampaignStatus,
  SchedulerService,
} from "@lib/database";
import { CampaignOrchestratorService } from "./campaign-orchestrator.service";

import {
  CAMPAIGN_JOB_TYPE,
} from "./constants";

@Injectable()
export class CampaignSchedulerService implements OnModuleInit {
  private readonly logger = new Logger(CampaignSchedulerService.name);

  constructor(
    @InjectRepository(CampaignEntity)
    private readonly campaignRepo: Repository<CampaignEntity>,
    private readonly orchestrator: CampaignOrchestratorService,
    private readonly schedulerService: SchedulerService,
  ) {}

  /**
   * Register the campaign execution handler with the generic scheduler.
   * This runs once when the module initializes.
   */
  onModuleInit(): void {
    this.schedulerService.registerHandler(
      CAMPAIGN_JOB_TYPE,
      async (tenantId: string, payload: Record<string, unknown>) => {
        const campaignId = payload["campaignId"] as string;
        if (!campaignId) {
          throw new Error(
            "campaign.execute handler: missing campaignId in payload",
          );
        }
        this.logger.log(
          `Executing campaign ${campaignId} for tenant ${tenantId} via scheduler`,
        );
        await this.orchestrator.execute(tenantId, campaignId);
      },
    );

    this.logger.log(
      `Registered handler for job type: ${CAMPAIGN_JOB_TYPE}`,
    );
  }

  /**
   * Check for one-time scheduled campaigns that are due.
   * These are campaigns with scheduledAt set and status = 'scheduled'.
   * Runs every 60 seconds.
   *
   * Note: Recurring campaigns are handled by the generic SchedulerService
   * via the registered "campaign.execute" handler. This method only
   * handles legacy one-time scheduled campaigns that store scheduledAt
   * directly on the campaign entity.
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
}
