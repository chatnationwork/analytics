/**
 * SendWorker -- BullMQ worker that processes individual campaign message sends.
 *
 * Rate limiting: The worker is capped at 80 messages/second (WhatsApp Cloud API
 * per-number limit) via BullMQ's built-in rate limiter. When WhatsApp returns a
 * 429, the worker dynamically extends the rate limit via worker.rateLimit().
 *
 * For each job:
 * 1. Calls WhatsappService.sendMessage()
 * 2. Updates the campaign_messages row with the result
 * 3. Records out-of-window sends against the 24h conversation quota
 * 4. Retryable errors throw (BullMQ retries). Permanent errors mark failed.
 * 5. After all jobs in a campaign complete, marks campaign as completed.
 */

import { Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Job, UnrecoverableError, Worker } from "bullmq";
import {
  CampaignMessageEntity,
  CampaignMessageStatus,
  CampaignEntity,
  CampaignStatus,
  ContactEntity,
  ContactRepository,
} from "@lib/database";
import { WhatsappService } from "../whatsapp/whatsapp.service";
import { RateTrackerService } from "./rate-tracker.service";
import { TemplateRendererService } from "./template-renderer.service";
import {
  CAMPAIGN_QUEUE_NAME,
  CAMPAIGN_JOBS,
  RETRYABLE_WA_ERROR_CODES,
  WA_MAX_MESSAGES_PER_SECOND,
} from "./constants";
import { CampaignSendJob } from "./campaign-orchestrator.service";

@Processor(CAMPAIGN_QUEUE_NAME, {
  limiter: {
    max: WA_MAX_MESSAGES_PER_SECOND,
    duration: 1_000,
  },
  concurrency: 5,
})
export class SendWorker extends WorkerHost {
  private readonly logger = new Logger(SendWorker.name);

  constructor(
    private readonly whatsappService: WhatsappService,
    private readonly rateTracker: RateTrackerService,
    private readonly templateRenderer: TemplateRendererService,
    private readonly contactRepo: ContactRepository,
    @InjectRepository(CampaignMessageEntity)
    private readonly messageRepo: Repository<CampaignMessageEntity>,
    @InjectRepository(CampaignEntity)
    private readonly campaignRepo: Repository<CampaignEntity>,
  ) {
    super();
  }

  async process(job: Job<CampaignSendJob>): Promise<void> {
    if (job.name !== CAMPAIGN_JOBS.SEND_MESSAGE) return;

    const {
      campaignId,
      campaignMessageId,
      tenantId,
      recipientPhone,
      messagePayload,
      isBusinessInitiated,
    } = job.data;

    // Pre-send: check if 24h quota is exhausted for business-initiated sends
    if (isBusinessInitiated) {
      const quotaOk = await this.rateTracker.hasQuotaRemaining(tenantId);
      if (!quotaOk) {
        this.logger.warn(
          `Campaign ${campaignId}: 24h conversation quota exhausted, pausing campaign`,
        );
        await this.pauseCampaignOnQuota(campaignId);
        throw new UnrecoverableError("24h conversation quota exhausted");
      }
    }

    try {
      await this.messageRepo.update(campaignMessageId, {
        attempts: () => '"attempts" + 1',
      });

      // Fetch contact to render message template placeholders
      const contact = await this.contactRepo.findOne(tenantId, recipientPhone);

      if (!contact) {
        throw new Error(`Contact not found: ${recipientPhone}`);
      }

      // Extract text body from message payload and render with contact data
      const textBody = (messagePayload as any)?.text?.body || "";
      const renderedBody = this.templateRenderer.render(textBody, contact);

      // Create final message payload with rendered template
      const renderedPayload = {
        ...messagePayload,
        text: {
          ...(messagePayload as any).text,
          body: renderedBody,
        },
      };

      const result = await this.whatsappService.sendMessage(
        tenantId,
        recipientPhone,
        renderedPayload as any,
      );

      if (result.success) {
        await this.messageRepo.update(campaignMessageId, {
          status: CampaignMessageStatus.SENT,
          waMessageId: result.messageId ?? null,
          sentAt: new Date(),
        });

        if (isBusinessInitiated) {
          await this.rateTracker.recordBusinessSend(tenantId);
        }
      } else {
        const errorCode = this.extractErrorCode(result.error);
        const isRetryable = this.isRetryableError(errorCode, result.error);

        if (this.isRateLimitError(errorCode)) {
          await this.messageRepo.update(campaignMessageId, {
            errorMessage: result.error ?? "Rate limited",
            errorCode,
          });
          // Dynamic rate limiting: pause the queue for 60 seconds
          await this.worker.rateLimit(60_000);
          throw Worker.RateLimitError();
        }

        if (isRetryable) {
          await this.messageRepo.update(campaignMessageId, {
            errorMessage: result.error ?? "Unknown error",
            errorCode,
          });
          throw new Error(`Retryable WhatsApp error: ${result.error}`);
        } else {
          await this.messageRepo.update(campaignMessageId, {
            status: CampaignMessageStatus.FAILED,
            errorMessage: result.error ?? "Unknown error",
            errorCode,
            failedAt: new Date(),
          });
        }
      }
    } catch (error: unknown) {
      if (error instanceof UnrecoverableError) {
        await this.messageRepo.update(campaignMessageId, {
          status: CampaignMessageStatus.FAILED,
          errorMessage: error.message,
          failedAt: new Date(),
        });
        return;
      }

      // Re-throw RateLimitError as-is for BullMQ to handle
      if (
        error instanceof Error &&
        error.message === "Rate limit"
      ) {
        throw error;
      }

      const errMsg =
        error instanceof Error ? error.message : String(error);

      if (job.attemptsMade >= (job.opts.attempts ?? 3) - 1) {
        await this.messageRepo.update(campaignMessageId, {
          status: CampaignMessageStatus.FAILED,
          errorMessage: errMsg,
          failedAt: new Date(),
        });
        await this.checkCampaignCompletion(campaignId);
        return;
      }

      throw error;
    }

    await this.checkCampaignCompletion(job.data.campaignId);
  }

  private async checkCampaignCompletion(campaignId: string): Promise<void> {
    const pendingCount = await this.messageRepo.count({
      where: [
        { campaignId, status: CampaignMessageStatus.PENDING },
        { campaignId, status: CampaignMessageStatus.QUEUED },
      ],
    });

    if (pendingCount === 0) {
      const campaign = await this.campaignRepo.findOne({
        where: { id: campaignId },
      });

      if (campaign && campaign.status === CampaignStatus.RUNNING) {
        await this.campaignRepo.update(campaignId, {
          status: CampaignStatus.COMPLETED,
          completedAt: new Date(),
        });
        this.logger.log(`Campaign ${campaignId} completed`);
      }
    }
  }

  private async pauseCampaignOnQuota(campaignId: string): Promise<void> {
    try {
      await this.campaignRepo.update(campaignId, {
        status: CampaignStatus.PAUSED,
      });
      this.logger.warn(`Campaign ${campaignId} paused due to quota exhaustion`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Failed to pause campaign ${campaignId}: ${msg}`);
    }
  }

  private extractErrorCode(error?: string): string | null {
    if (!error) return null;
    const match = error.match(/(\d{3,6})/);
    return match ? match[1] : null;
  }

  private isRateLimitError(code: string | null): boolean {
    return code === "429" || code === "131048" || code === "131056";
  }

  private isRetryableError(code: string | null, message?: string): boolean {
    if (code && RETRYABLE_WA_ERROR_CODES.has(code)) return true;
    if (message?.toLowerCase().includes("timeout")) return true;
    if (message?.toLowerCase().includes("econnrefused")) return true;
    if (message?.toLowerCase().includes("econnreset")) return true;
    return false;
  }
}
