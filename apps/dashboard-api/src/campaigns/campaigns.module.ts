import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { ConfigModule, ConfigService } from "@nestjs/config";
import Redis from "ioredis";
import { redisConfig } from "@lib/common";
import { DatabaseModule } from "@lib/database";
import { CampaignsController } from "./campaigns.controller";
import { CampaignsService } from "./campaigns.service";
import { AudienceService } from "./audience.service";
import { CampaignOrchestratorService } from "./campaign-orchestrator.service";
import { CampaignSchedulerService } from "./campaign-scheduler.service";
import { TriggerService } from "./trigger.service";
import { CampaignAnalyticsService } from "./campaign-analytics.service";
import { RateTrackerService } from "./rate-tracker.service";
import { TemplateRendererService } from "./template-renderer.service";
import { SendWorker } from "./send.worker";
import {
  CAMPAIGN_QUEUE_NAME,
  CAMPAIGN_REDIS_CLIENT,
  WA_MAX_MESSAGES_PER_SECOND,
} from "./constants";
import { WhatsappModule } from "../whatsapp/whatsapp.module";
import { CrmIntegrationsModule } from "../crm-integrations/crm-integrations.module";



@Module({
  imports: [
    ConfigModule.forFeature(redisConfig),
    DatabaseModule.forFeature(),

    /**
     * Register the BullMQ queue for campaign message sending.
     * Uses the same Redis instance as the analytics event queue.
     */
    BullModule.forRootAsync({
      imports: [ConfigModule.forFeature(redisConfig)],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get<string>("redis.host"),
          port: configService.get<number>("redis.port"),
        },
      }),
      inject: [ConfigService],
    }),

    BullModule.registerQueue({
      name: CAMPAIGN_QUEUE_NAME,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: "exponential", delay: 30_000 },
        removeOnComplete: { age: 7 * 24 * 60 * 60 }, // 7 days
        removeOnFail: { age: 30 * 24 * 60 * 60 }, // 30 days
      },
    }),

    WhatsappModule,
    CrmIntegrationsModule,
  ],
  controllers: [CampaignsController],
  providers: [
    /**
     * Redis client for conversation quota tracking (rate-tracker.service).
     * Separate from BullMQ's internal Redis connection.
     */
    {
      provide: CAMPAIGN_REDIS_CLIENT,
      useFactory: (configService: ConfigService) => {
        return new Redis({
          host: configService.get<string>("redis.host"),
          port: configService.get<number>("redis.port"),
          maxRetriesPerRequest: 3,
          lazyConnect: true,
        });
      },
      inject: [ConfigService],
    },
    CampaignsService,
    AudienceService,
    CampaignOrchestratorService,
    CampaignSchedulerService,
    TriggerService,
    CampaignAnalyticsService,
    RateTrackerService,
    TemplateRendererService,
    SendWorker,
  ],
  exports: [CampaignsService, TriggerService, RateTrackerService],
})
export class CampaignsModule {}
