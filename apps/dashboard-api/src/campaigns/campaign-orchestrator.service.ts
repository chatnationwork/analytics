/**
 * CampaignOrchestratorService -- resolves audience with 24h window split,
 * creates campaign_messages rows, and enqueues BullMQ jobs with tiered
 * staggered delays for rate-limited delivery.
 *
 * Delivery strategy:
 * 1. In-window contacts (free) are enqueued first with no delay.
 * 2. Out-of-window contacts (business-initiated, tier-limited) are enqueued
 *    second with staggered delays proportional to audience size.
 * 3. BullMQ's built-in rate limiter (80 msg/s) handles per-second pacing.
 */

import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import { Repository } from "typeorm";
import {
  CampaignEntity,
  CampaignStatus,
  CampaignMessageEntity,
  CampaignMessageStatus,
} from "@lib/database";
import { CampaignsService } from "./campaigns.service";
import { AudienceService, AudienceFilter } from "./audience.service";
import { RateTrackerService } from "./rate-tracker.service";
import {
  CAMPAIGN_QUEUE_NAME,
  CAMPAIGN_JOBS,
  ENQUEUE_BATCH_SIZE,
  DELIVERY_TIERS,
  STAGGER_CHUNK_SIZE,
  STAGGER_DELAY_MS,
  LARGE_STAGGER_CHUNK_SIZE,
  LARGE_STAGGER_DELAY_MS,
  WA_MAX_MESSAGES_PER_SECOND,
} from "./constants";
import { ContactEntity } from "@lib/database";

export interface CampaignSendJob {
  campaignId: string;
  campaignMessageId: string;
  tenantId: string;
  recipientPhone: string;
  messagePayload: Record<string, unknown>;
  attempt: number;
  /** Whether this send counts against the 24h conversation tier quota. */
  isBusinessInitiated: boolean;
}

@Injectable()
export class CampaignOrchestratorService {
  private readonly logger = new Logger(CampaignOrchestratorService.name);

  constructor(
    private readonly campaignsService: CampaignsService,
    private readonly audienceService: AudienceService,
    private readonly rateTracker: RateTrackerService,
    @InjectRepository(CampaignMessageEntity)
    private readonly messageRepo: Repository<CampaignMessageEntity>,
    @InjectQueue(CAMPAIGN_QUEUE_NAME)
    private readonly sendQueue: Queue,
  ) {}

  /**
   * Execute a campaign: resolve audience with window split, check quota,
   * create delivery rows, and enqueue jobs with tiered delays.
   */
  async execute(tenantId: string, campaignId: string): Promise<void> {
    const campaign = await this.campaignsService.findById(tenantId, campaignId);

    const allowedStatuses: CampaignStatus[] = [
      CampaignStatus.DRAFT,
      CampaignStatus.SCHEDULED,
    ];
    if (!allowedStatuses.includes(campaign.status)) {
      this.logger.warn(
        `Campaign ${campaignId} has status "${campaign.status}", skipping execution`,
      );
      return;
    }

    this.logger.log(`Executing campaign ${campaignId} "${campaign.name}"`);

    // 1. Resolve audience with 24h window split
    const filter = campaign.audienceFilter as AudienceFilter | null;
    const { inWindow, outOfWindow } =
      await this.audienceService.resolveContactsWithWindowSplit(tenantId, filter);

    const totalContacts = inWindow.length + outOfWindow.length;

    if (totalContacts === 0) {
      this.logger.warn(
        `Campaign ${campaignId} has no matching contacts, marking completed`,
      );
      await this.campaignsService.updateStatus(
        campaignId,
        CampaignStatus.COMPLETED,
        {
          recipientCount: 0,
          startedAt: new Date(),
          completedAt: new Date(),
        },
      );
      return;
    }

    // 2. Pre-launch quota check for out-of-window contacts
    if (outOfWindow.length > 0) {
      const quotaCheck = await this.rateTracker.checkQuota(
        tenantId,
        outOfWindow.length,
      );

      if (!quotaCheck.canProceed) {
        this.logger.warn(
          `Campaign ${campaignId}: ${quotaCheck.warning}`,
        );
        await this.campaignsService.updateStatus(
          campaignId,
          CampaignStatus.PAUSED,
        );
        throw new Error(
          quotaCheck.warning ?? "Conversation quota exceeded",
        );
      }

      if (quotaCheck.warning) {
        this.logger.warn(
          `Campaign ${campaignId}: ${quotaCheck.warning}`,
        );
      }
    }

    // 3. Estimate completion time
    const estimatedSeconds = totalContacts / WA_MAX_MESSAGES_PER_SECOND;
    const estimatedCompletionAt = new Date(
      Date.now() + estimatedSeconds * 1000,
    );

    // 4. Mark campaign as running
    await this.campaignsService.updateStatus(
      campaignId,
      CampaignStatus.RUNNING,
      {
        recipientCount: totalContacts,
        startedAt: new Date(),
        estimatedCompletionAt,
      },
    );

    this.logger.log(
      `Campaign ${campaignId}: ${inWindow.length} in-window (free), ${outOfWindow.length} out-of-window (tier-limited). Estimated: ${Math.ceil(estimatedSeconds)}s`,
    );

    // 5. Create message rows and enqueue: in-window first, then out-of-window
    const inWindowMessages = await this.createAndEnqueue(
      campaign,
      inWindow,
      false, // not business-initiated
      0, // no base delay
    );

    // Out-of-window starts after estimated in-window time
    const inWindowDurationMs = Math.ceil(
      (inWindow.length / WA_MAX_MESSAGES_PER_SECOND) * 1000,
    );
    const outOfWindowMessages = await this.createAndEnqueue(
      campaign,
      outOfWindow,
      true, // business-initiated
      inWindowDurationMs,
    );

    this.logger.log(
      `Campaign ${campaignId}: enqueued ${inWindowMessages + outOfWindowMessages} messages`,
    );
  }

  /**
   * Execute a campaign for a single contact (used by event triggers).
   */
  async executeForContact(
    tenantId: string,
    campaignId: string,
    contactId: string,
    contactPhone: string,
    isBusinessInitiated: boolean = true,
  ): Promise<void> {
    const campaign = await this.campaignsService.findById(tenantId, campaignId);

    const msg = this.messageRepo.create({
      campaignId,
      tenantId,
      contactId,
      recipientPhone: contactPhone,
      isBusinessInitiated,
      status: CampaignMessageStatus.PENDING,
    });

    const saved = await this.messageRepo.save(msg);

    const jobData: CampaignSendJob = {
      campaignId,
      campaignMessageId: saved.id,
      tenantId,
      recipientPhone: contactPhone,
      messagePayload: campaign.messageTemplate,
      attempt: 0,
      isBusinessInitiated,
    };

    await this.sendQueue.add(CAMPAIGN_JOBS.SEND_MESSAGE, jobData, {
      jobId: `cm-${saved.id}`,
    });
  }

  /**
   * Create campaign_messages rows and enqueue BullMQ jobs for a set of contacts.
   * Returns the number of messages enqueued.
   */
  private async createAndEnqueue(
    campaign: CampaignEntity,
    contacts: ContactEntity[],
    isBusinessInitiated: boolean,
    baseDelayMs: number,
  ): Promise<number> {
    if (contacts.length === 0) return 0;

    // Batch-insert message rows
    const messageRows: Partial<CampaignMessageEntity>[] = contacts.map(
      (c) => ({
        campaignId: campaign.id,
        tenantId: campaign.tenantId,
        contactId: c.id,
        recipientPhone: c.contactId,
        isBusinessInitiated,
        status: CampaignMessageStatus.PENDING,
      }),
    );

    const savedMessages = await this.batchInsertMessages(messageRows);

    // Enqueue with tiered delays
    await this.enqueueJobsWithTieredDelay(
      campaign,
      savedMessages,
      isBusinessInitiated,
      baseDelayMs,
    );

    return savedMessages.length;
  }

  /**
   * Enqueue jobs with delays based on audience size tier.
   */
  private async enqueueJobsWithTieredDelay(
    campaign: CampaignEntity,
    messages: CampaignMessageEntity[],
    isBusinessInitiated: boolean,
    baseDelayMs: number,
  ): Promise<void> {
    const count = messages.length;

    let chunkSize: number;
    let delayPerChunk: number;

    if (count <= DELIVERY_TIERS.IMMEDIATE_MAX) {
      // Small audience: enqueue all at once, rate limiter handles pacing
      chunkSize = ENQUEUE_BATCH_SIZE;
      delayPerChunk = 0;
    } else if (count <= DELIVERY_TIERS.CHUNKED_MAX) {
      // Medium audience: small chunks with short delays
      chunkSize = STAGGER_CHUNK_SIZE;
      delayPerChunk = STAGGER_DELAY_MS;
    } else {
      // Large audience: larger chunks with proportional delays
      chunkSize = LARGE_STAGGER_CHUNK_SIZE;
      delayPerChunk = LARGE_STAGGER_DELAY_MS;
    }

    let chunkIndex = 0;
    for (let i = 0; i < messages.length; i += chunkSize) {
      const batch = messages.slice(i, i + chunkSize);
      const chunkDelay = baseDelayMs + chunkIndex * delayPerChunk;

      const jobs = batch.map((msg) => ({
        name: CAMPAIGN_JOBS.SEND_MESSAGE,
        data: {
          campaignId: campaign.id,
          campaignMessageId: msg.id,
          tenantId: campaign.tenantId,
          recipientPhone: msg.recipientPhone,
          messagePayload: campaign.messageTemplate,
          attempt: 0,
          isBusinessInitiated,
        } satisfies CampaignSendJob,
        opts: {
          jobId: `cm-${msg.id}`,
          ...(chunkDelay > 0 ? { delay: chunkDelay } : {}),
        },
      }));

      await this.sendQueue.addBulk(jobs);
      chunkIndex++;
    }

    // Update message statuses to QUEUED
    const ids = messages.map((m) => m.id);
    for (let i = 0; i < ids.length; i += ENQUEUE_BATCH_SIZE) {
      const batch = ids.slice(i, i + ENQUEUE_BATCH_SIZE);
      await this.messageRepo
        .createQueryBuilder()
        .update()
        .set({ status: CampaignMessageStatus.QUEUED })
        .whereInIds(batch)
        .execute();
    }
  }

  private async batchInsertMessages(
    rows: Partial<CampaignMessageEntity>[],
  ): Promise<CampaignMessageEntity[]> {
    const results: CampaignMessageEntity[] = [];

    for (let i = 0; i < rows.length; i += ENQUEUE_BATCH_SIZE) {
      const batch = rows.slice(i, i + ENQUEUE_BATCH_SIZE);
      const entities = this.messageRepo.create(batch);
      const saved = await this.messageRepo.save(entities);
      results.push(...saved);
    }

    return results;
  }
}
