import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { BullModule } from "@nestjs/bullmq";
import { DatabaseModule } from "@lib/database";
import {
  EosEvent,
  EosTicketType,
  EosTicket,
  EosExhibitor,
  EosLead,
  ContactEntity,
  IdentityEntity,
  GeneratedCard,
  SchedulerModule,
} from "@lib/database";

import { EosEventController } from "./eos-event.controller";
import { EosTicketController } from "./eos-ticket.controller";
import { EosExhibitorController } from "./eos-exhibitor.controller";
import { EosTicketTypeController } from "./eos-ticket-type.controller";
import { EosLeadController } from "./eos-lead.controller";
import { EosPublicController } from "./eos-public.controller";

import { EosEventService } from "./eos-event.service";
import { EosTicketService } from "./eos-ticket.service";
import { EosLeadService } from "./eos-lead.service";
import { EosTicketTypeService } from "./eos-ticket-type.service";
import { EosExhibitorService } from "./eos-exhibitor.service";
import { GeneratedCardService } from "./generated-card.service";

import { LeadProcessorWorker } from "./workers/lead-processor.worker";
import { HypeCardWorker } from "./workers/hypecard.worker";
import { EosTicketCleanupCron } from "./eos-ticket-cleanup.cron";
import { EosEventLifecycleCron } from "./eos-event-lifecycle.cron";

import { BillingModule } from "../billing/billing.module";
import { CampaignsModule } from "../campaigns/campaigns.module";

@Module({
  imports: [
    DatabaseModule.forFeature(), // Provides Request scoped Repos? Wait, DatabaseModule.forFeature provides repositories.
    TypeOrmModule.forFeature([
      EosEvent,
      EosTicketType,
      EosTicket,
      EosExhibitor,
      EosLead,
      ContactEntity,
      IdentityEntity,
      GeneratedCard,
    ]),
    BullModule.registerQueue(
      { name: "eos-lead-processing" },
      { name: "eos-hypecard-generation" },
    ),
    BillingModule,
    CampaignsModule, // For TriggerService
    SchedulerModule,
  ],
  controllers: [
    EosEventController,
    EosTicketController,
    EosExhibitorController,
    EosTicketTypeController,
    EosLeadController,
    EosPublicController,
  ],
  providers: [
    EosEventService,
    EosTicketService,
    EosLeadService,
    EosTicketTypeService,
    EosExhibitorService,
    GeneratedCardService,
    LeadProcessorWorker,
    HypeCardWorker,
    EosTicketCleanupCron,
    EosEventLifecycleCron,
  ],
  exports: [
    EosEventService, // Export if needed by other modules
  ],
})
export class EosModule {}
