/**
 * =============================================================================
 * AGENT SYSTEM MODULE
 * =============================================================================
 *
 * NestJS module that bundles all Agent System components:
 * - Inbox management (sessions, messages)
 * - Assignment logic (routing strategies)
 * - Team management
 * - Agent status management
 */

import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import {
  InboxSessionEntity,
  MessageEntity,
  ResolutionEntity,
  AgentProfileEntity,
  AgentSessionEntity,
  TeamEntity,
  TeamMemberEntity,
  ShiftEntity,
  AssignmentConfigEntity,
  UserEntity,
  RolePermissionEntity,
  TenantMembershipEntity,
  DatabaseModule,
} from "@lib/database";

import { InboxService } from "./inbox.service";
import { AssignmentService } from "./assignment.service";
import { RbacModule } from "./rbac.module";
import { AgentInboxController } from "./agent-inbox.controller";
import { TeamController } from "./team.controller";
import { IntegrationController } from "./integration.controller";
import { PresenceService } from "./presence.service";
import { AgentStatusService } from "./agent-status.service";
import { AgentStatusController } from "./agent-status.controller";
import { WhatsappModule } from "../whatsapp/whatsapp.module";
import { ApiKeysModule } from "../api-keys/api-keys.module";

@Module({
  imports: [
    RbacModule,
    ApiKeysModule,
    WhatsappModule,
    DatabaseModule.forFeature(), // Provides EventRepository for analytics events
    TypeOrmModule.forFeature([
      InboxSessionEntity,
      MessageEntity,
      ResolutionEntity,
      AgentProfileEntity,
      TeamEntity,
      TeamMemberEntity,
      ShiftEntity,
      AssignmentConfigEntity,
      UserEntity,
      TenantMembershipEntity,
      AgentSessionEntity,
    ]),
  ],
  controllers: [
    AgentInboxController,
    TeamController,
    IntegrationController,
    AgentStatusController,
  ],
  providers: [
    InboxService,
    AssignmentService,
    PresenceService,
    AgentStatusService,
  ],
  exports: [
    InboxService,
    AssignmentService,
    PresenceService,
    AgentStatusService,
    RbacModule,
  ],
})
export class AgentSystemModule {}
