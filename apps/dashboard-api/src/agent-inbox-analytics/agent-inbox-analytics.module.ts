/**
 * =============================================================================
 * AGENT INBOX ANALYTICS MODULE
 * =============================================================================
 *
 * NestJS module for agent inbox analytics.
 * Provides resolution, transfer, and chat status metrics.
 */

import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { DatabaseModule, InboxSessionEntity } from "@lib/database";
import { AgentInboxAnalyticsController } from "./agent-inbox-analytics.controller";
import { AgentInboxAnalyticsService } from "./agent-inbox-analytics.service";

@Module({
  imports: [
    DatabaseModule.forFeature(), // Provides EventRepository
    TypeOrmModule.forFeature([InboxSessionEntity]),
  ],
  controllers: [AgentInboxAnalyticsController],
  providers: [AgentInboxAnalyticsService],
  exports: [AgentInboxAnalyticsService],
})
export class AgentInboxAnalyticsModule {}
