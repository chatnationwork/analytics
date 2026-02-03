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
  ContactNoteEntity,
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
import { ContactProfileController } from "./contact-profile.controller";
import { ContactProfileService } from "./contact-profile.service";
import { WhatsappModule } from "../whatsapp/whatsapp.module";
import { ApiKeysModule } from "../api-keys/api-keys.module";
import { AuditModule } from "../audit/audit.module";

@Module({
  imports: [
    RbacModule,
    ApiKeysModule,
    WhatsappModule,
    AuditModule,
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
      ContactNoteEntity,
    ]),
  ],
  controllers: [
    AgentInboxController,
    TeamController,
    IntegrationController,
    AgentStatusController,
    ContactProfileController,
  ],
  providers: [
    InboxService,
    AssignmentService,
    PresenceService,
    AgentStatusService,
    ContactProfileService,
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
