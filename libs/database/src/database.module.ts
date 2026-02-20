/**
 * =============================================================================
 * DATABASE MODULE
 * =============================================================================
 *
 * NestJS module that sets up TypeORM and provides database access.
 *
 * DYNAMIC MODULE PATTERN:
 * ----------------------
 * This is a "dynamic module" - its behavior changes based on how you call it:
 *
 * - DatabaseModule.forRoot()
 *   Used in the root module. Creates the database connection.
 *   Should only be called ONCE in your application.
 *
 * - DatabaseModule.forFeature()
 *   Used in feature modules. Provides access to repositories.
 *   Can be called in multiple modules.
 *
 * WHY DYNAMIC MODULES?
 * -------------------
 * - forRoot() initializes expensive resources (DB connection) once
 * - forFeature() shares that connection with other modules
 * - Configuration can be different for each use case
 *
 * TYPEORM INTEGRATION:
 * -------------------
 * @nestjs/typeorm provides integration between NestJS and TypeORM:
 * - TypeOrmModule.forRoot(): Create connection
 * - TypeOrmModule.forFeature(): Register entities for a module
 * - @InjectRepository(): Inject a TypeORM repository
 */

import { Module, DynamicModule } from "@nestjs/common";
import { TypeOrmModule, TypeOrmModuleOptions } from "@nestjs/typeorm";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { EventEntity } from "./entities/event.entity";
import { SessionEntity } from "./entities/session.entity";
import { IdentityEntity } from "./entities/identity.entity";
import { ProjectEntity } from "./entities/project.entity";
import { UserEntity } from "./entities/user.entity";
import { TenantEntity } from "./entities/tenant.entity";
import { TenantMembershipEntity } from "./entities/tenant-membership.entity";
import { CrmIntegrationEntity } from "./entities/crm-integration.entity";
import { ApiKeyEntity } from "./entities/api-key.entity";
import { InvitationEntity } from "./entities/invitation.entity";
import { AgentProfileEntity } from "./entities/agent-profile.entity";
import { TeamEntity } from "./entities/team.entity";
import { TeamMemberEntity } from "./entities/team-member.entity";
import { InboxSessionEntity } from "./entities/inbox-session.entity";
import { MessageEntity } from "./entities/message.entity";
import { ResolutionEntity } from "./entities/resolution.entity";
import { ShiftEntity } from "./entities/shift.entity";
import { AssignmentConfigEntity } from "./entities/assignment-config.entity";
import { RolePermissionEntity } from "./entities/role-permission.entity";
import { RoleEntity } from "./entities/role.entity";
import { ContactEntity } from "./entities/contact.entity";
import { ContactNoteEntity } from "./entities/contact-note.entity";
import { AgentSessionEntity } from "./entities/agent-session.entity";
import { AuditLogEntity } from "./entities/audit-log.entity";
import { TwoFaVerificationEntity } from "./entities/two-fa-verification.entity";
import { PasswordResetTokenEntity } from "./entities/password-reset-token.entity";
import { UserSessionEntity } from "./entities/user-session.entity";
import { SessionTakeoverRequestEntity } from "./entities/session-takeover-request.entity";
import { EntityArchiveEntity } from "./entities/entity-archive.entity";
import { CampaignEntity } from "./entities/campaign.entity";
import { CampaignMessageEntity } from "./entities/campaign-message.entity";
import { CampaignScheduleEntity } from "./entities/campaign-schedule.entity";
import { EosEvent } from "./entities/eos-event.entity";
import { EosTicketType } from "./entities/eos-ticket-type.entity";
import { EosTicket } from "./entities/eos-ticket.entity";
import { EosExhibitor } from "./entities/eos-exhibitor.entity";
import { EosSpeaker } from "./entities/eos-speaker.entity";
import { EosLead } from "./entities/eos-lead.entity";
import { EosPoll } from "./entities/eos-poll.entity";
import { EosPollOption } from "./entities/eos-poll-option.entity";
import { EosPollResponse } from "./entities/eos-poll-response.entity";
import { EosFeedback } from "./entities/eos-feedback.entity";
import { GeneratedCard } from "./entities/generated-card.entity";
import { ImportMappingTemplate } from "./entities/import-mapping-template.entity";
import { TemplateEntity } from "./entities/template.entity";
import { ScheduleEntity } from "./scheduler/schedule.entity";
import { EventRepository } from "./repositories/event.repository";
import { SessionRepository } from "./repositories/session.repository";
import { ProjectRepository } from "./repositories/project.repository";
import { UserRepository } from "./repositories/user.repository";
import { TenantRepository } from "./repositories/tenant.repository";
import { CrmIntegrationRepository } from "./repositories/crm-integration.repository";
import { ApiKeyRepository } from "./repositories/api-key.repository";
import { ContactRepository } from "./repositories/contact.repository";
import { AgentSessionRepository } from "./repositories/agent-session.repository";
import { AuditLogRepository } from "./repositories/audit-log.repository";
import { UserSessionRepository } from "./repositories/user-session.repository";
import { SegmentationService } from "./segmentation/segmentation.service";

/**
 * All entities that map to database tables.
 * TypeORM needs to know about these to create tables and run queries.
 */
const entities = [
  EventEntity,
  SessionEntity,
  IdentityEntity,
  ProjectEntity,
  UserEntity,
  TenantEntity,
  TenantMembershipEntity,
  CrmIntegrationEntity,
  ApiKeyEntity,
  InvitationEntity,
  AgentProfileEntity,
  TeamEntity,
  TeamMemberEntity,
  InboxSessionEntity,
  MessageEntity,
  ResolutionEntity,
  ShiftEntity,
  AssignmentConfigEntity,
  RolePermissionEntity,
  RoleEntity,
  ContactEntity,
  ContactNoteEntity,
  AgentSessionEntity,
  AuditLogEntity,
  TwoFaVerificationEntity,
  PasswordResetTokenEntity,
  UserSessionEntity,
  SessionTakeoverRequestEntity,
  EntityArchiveEntity,
  CampaignEntity,
  CampaignMessageEntity,
  CampaignMessageEntity,
  CampaignScheduleEntity,
  CampaignScheduleEntity,
  EosEvent,
  EosTicketType,
  EosTicket,
  EosExhibitor,
  EosSpeaker,
  EosLead,
  EosPoll,
  EosPollOption,
  EosPollResponse,
  EosFeedback,
  GeneratedCard,
  ImportMappingTemplate,
  TemplateEntity,
  ScheduleEntity,
];

/**
 * Custom repository classes that wrap TypeORM repositories.
 * These add our custom query methods.
 */
const repositories = [
  EventRepository,
  SessionRepository,
  ProjectRepository,
  UserRepository,
  TenantRepository,
  CrmIntegrationRepository,
  ApiKeyRepository,
  ContactRepository,
  AgentSessionRepository,
  AuditLogRepository,
  UserSessionRepository,
];

/**
 * Database module that provides TypeORM integration.
 *
 * @Module({}) with empty config because this is a dynamic module.
 * The actual configuration happens in forRoot() and forFeature().
 */
@Module({})
export class DatabaseModule {
  /**
   * Initialize the database connection.
   *
   * Call this ONCE in your root module (e.g., CollectorModule, ProcessorModule).
   *
   * @returns DynamicModule configured with TypeORM connection
   *
   * @example
   * @Module({
   *   imports: [DatabaseModule.forRoot()],
   * })
   * export class AppModule {}
   */
  static forRoot(): DynamicModule {
    return {
      module: DatabaseModule,
      imports: [
        /**
         * TypeOrmModule.forRootAsync()
         * ----------------------------
         * Creates the database connection asynchronously.
         * We use async so we can inject ConfigService to read env vars.
         */
        TypeOrmModule.forRootAsync({
          imports: [ConfigModule],
          useFactory: (configService: ConfigService): TypeOrmModuleOptions => ({
            // Database type
            type: "postgres",

            // Connection details from environment
            host: configService.get("database.host"),
            port: configService.get("database.port"),
            username: configService.get("database.username"),
            password: configService.get("database.password"),
            database: configService.get("database.database"),

            // All entities this connection can use
            entities,

            // Auto-create tables (DEV ONLY or explicit override)
            synchronize:
              configService.get("app.nodeEnv") === "development" ||
              configService.get("database.synchronize"),

            // Log SQL queries in development
            logging: ["error", "warn"],
          }),
          inject: [ConfigService],
        }),

        // Register entities for this module
        TypeOrmModule.forFeature(entities),
      ],
      providers: [...repositories],
      exports: [TypeOrmModule, ...repositories],
    };
  }

  /**
   * Access repositories in a feature module.
   *
   * WHEN TO USE:
   * -----------
   * If a feature module needs direct access to repositories
   * AND you've already called forRoot() in the root module.
   *
   * @returns DynamicModule with repository providers
   */
  static forFeature(): DynamicModule {
    return {
      module: DatabaseModule,
      imports: [TypeOrmModule.forFeature(entities)],
      providers: [...repositories, SegmentationService],
      exports: [TypeOrmModule, ...repositories, SegmentationService],
    };
  }
}
