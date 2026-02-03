/**
 * =============================================================================
 * INBOX SERVICE
 * =============================================================================
 *
 * Manages InboxSessions and Messages for the Agent System.
 * Provides methods to create sessions, add messages, and manage session state.
 */

import {
  Injectable,
  NotFoundException,
  Logger,
  BadRequestException,
  ConflictException,
} from "@nestjs/common";
import { InjectRepository, InjectDataSource } from "@nestjs/typeorm";
import { DataSource } from "typeorm";
import { Repository, LessThan } from "typeorm";
import {
  InboxSessionEntity,
  SessionStatus,
  MessageEntity,
  MessageDirection,
  MessageType,
  ResolutionEntity,
  TeamEntity,
  EventRepository,
  CreateEventDto,
} from "@lib/database";
import { randomUUID } from "crypto";
import { WhatsappService } from "../whatsapp/whatsapp.service";

/**
 * Filter types for inbox queries
 */
export type InboxFilter =
  | "all"
  | "assigned"
  | "unassigned"
  | "pending"
  | "resolved"
  | "expired";

/**
 * DTO for creating a new message
 */
export interface CreateMessageDto {
  sessionId?: string;
  tenantId: string;
  contactId: string;
  contactName?: string;
  externalId?: string;
  direction: MessageDirection;
  type?: MessageType;
  content?: string;
  metadata?: Record<string, unknown>;
  senderId?: string;
  channel?: string;
  context?: Record<string, unknown>;
}

/**
 * Service for managing inbox sessions and messages.
 * Handles the core logic of tracking conversations between users and agents.
 */
@Injectable()
export class InboxService {
  private readonly logger = new Logger(InboxService.name);

  constructor(
    @InjectRepository(InboxSessionEntity)
    private readonly sessionRepo: Repository<InboxSessionEntity>,
    @InjectRepository(MessageEntity)
    private readonly messageRepo: Repository<MessageEntity>,
    @InjectRepository(ResolutionEntity)
    private readonly resolutionRepo: Repository<ResolutionEntity>,
    @InjectRepository(TeamEntity)
    private readonly teamRepo: Repository<TeamEntity>,
    private readonly eventRepository: EventRepository,
    private readonly whatsappService: WhatsappService,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  /**
   * Gets or creates a session for a contact.
   * If an active (unassigned/assigned) session exists, returns it.
   * Otherwise, creates a new one.
   */
  async getOrCreateSession(
    tenantId: string,
    contactId: string,
    contactName?: string,
    channel = "whatsapp",
    context?: Record<string, unknown>,
  ): Promise<InboxSessionEntity> {
    // Look for existing active session
    let session = await this.sessionRepo.findOne({
      where: {
        tenantId,
        contactId,
        status: SessionStatus.ASSIGNED,
      },
    });

    if (!session) {
      session = await this.sessionRepo.findOne({
        where: {
          tenantId,
          contactId,
          status: SessionStatus.UNASSIGNED,
        },
      });
    }

    if (session) {
      return session;
    }

    // Create new session
    const newSession = this.sessionRepo.create({
      tenantId,
      contactId,
      contactName,
      channel,
      status: SessionStatus.UNASSIGNED,
      context,
    });

    return this.sessionRepo.save(newSession);
  }

  /**
   * Records a message in a session.
   * If no session exists, creates one first.
   */
  async addMessage(dto: CreateMessageDto): Promise<MessageEntity> {
    // Get or create session
    const session = await this.getOrCreateSession(
      dto.tenantId,
      dto.contactId,
      dto.contactName,
      dto.channel || "whatsapp",
      dto.context,
    );

    // Create message
    const message = this.messageRepo.create({
      sessionId: session.id,
      tenantId: dto.tenantId,
      externalId: dto.externalId,
      direction: dto.direction,
      type: dto.type || MessageType.TEXT,
      content: dto.content,
      metadata: dto.metadata,
      senderId: dto.senderId,
    });

    const savedMessage = await this.messageRepo.save(message);

    // Update session's lastMessageAt
    await this.sessionRepo.update(session.id, {
      lastMessageAt: new Date(),
    });

    return savedMessage;
  }

  /**
   * Get inbox sessions for an agent.
   * Returns sessions assigned to the agent, filtered by type:
   * - 'all': All sessions (including resolved)
   * - 'pending': Sessions that are ASSIGNED but not resolved
   * - 'resolved': Sessions that are RESOLVED
   * - 'expired': Sessions where lastMessageAt > 24 hours ago and still ASSIGNED
   */
  async getAgentInbox(
    tenantId: string,
    agentId: string,
    filter?: InboxFilter,
  ): Promise<InboxSessionEntity[]> {
    const query = this.sessionRepo
      .createQueryBuilder("session")
      .where("session.tenantId = :tenantId", { tenantId })
      .andWhere("session.assignedAgentId = :agentId", { agentId });

    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    switch (filter) {
      case "all":
        // Show all sessions assigned to this agent
        break;
      case "pending":
        // Show only ASSIGNED sessions (not resolved, not expired)
        query.andWhere("session.status = :status", {
          status: SessionStatus.ASSIGNED,
        });
        query.andWhere(
          "(session.lastMessageAt IS NULL OR session.lastMessageAt > :cutoff)",
          {
            cutoff: twentyFourHoursAgo,
          },
        );
        break;
      case "resolved":
        // Show only RESOLVED sessions
        query.andWhere("session.status = :status", {
          status: SessionStatus.RESOLVED,
        });
        break;
      case "expired":
        // Show ASSIGNED sessions where lastMessageAt > 24 hours ago
        query.andWhere("session.status = :status", {
          status: SessionStatus.ASSIGNED,
        });
        query.andWhere("session.lastMessageAt <= :cutoff", {
          cutoff: twentyFourHoursAgo,
        });
        break;
      default:
        // Default: show all non-resolved sessions (pending + expired)
        query.andWhere("session.status != :resolved", {
          resolved: SessionStatus.RESOLVED,
        });
    }

    query.orderBy("session.lastMessageAt", "DESC");

    return query.getMany();
  }

  /**
   * Get all inbox sessions for a tenant (assigned and unassigned).
   * Used when the user has session.view_all (e.g. super admin).
   */
  async getTenantInbox(
    tenantId: string,
    filter?: InboxFilter,
  ): Promise<InboxSessionEntity[]> {
    const query = this.sessionRepo
      .createQueryBuilder("session")
      .where("session.tenantId = :tenantId", { tenantId });

    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    switch (filter) {
      case "all":
        break;
      case "assigned":
        query.andWhere("session.status = :status", {
          status: SessionStatus.ASSIGNED,
        });
        break;
      case "unassigned":
        query.andWhere("session.status = :status", {
          status: SessionStatus.UNASSIGNED,
        });
        break;
      case "pending":
        query.andWhere("session.status = :status", {
          status: SessionStatus.ASSIGNED,
        });
        query.andWhere(
          "(session.lastMessageAt IS NULL OR session.lastMessageAt > :cutoff)",
          { cutoff: twentyFourHoursAgo },
        );
        break;
      case "resolved":
        query.andWhere("session.status = :status", {
          status: SessionStatus.RESOLVED,
        });
        break;
      case "expired":
        query.andWhere("session.status = :status", {
          status: SessionStatus.ASSIGNED,
        });
        query.andWhere("session.lastMessageAt <= :cutoff", {
          cutoff: twentyFourHoursAgo,
        });
        break;
      default:
        query.andWhere("session.status != :resolved", {
          resolved: SessionStatus.RESOLVED,
        });
    }

    query.orderBy("session.lastMessageAt", "DESC");
    return query.getMany();
  }

  /**
   * Get unassigned sessions for a team or tenant.
   */
  async getUnassignedSessions(
    tenantId: string,
    teamId?: string,
  ): Promise<InboxSessionEntity[]> {
    const query = this.sessionRepo
      .createQueryBuilder("session")
      .where("session.tenantId = :tenantId", { tenantId })
      .andWhere("session.status = :status", {
        status: SessionStatus.UNASSIGNED,
      });

    if (teamId) {
      query.andWhere("session.assignedTeamId = :teamId", { teamId });
    }

    query.orderBy("session.createdAt", "ASC");

    return query.getMany();
  }

  /**
   * Get messages for a session.
   */
  async getSessionMessages(sessionId: string): Promise<MessageEntity[]> {
    return this.messageRepo.find({
      where: { sessionId },
      order: { createdAt: "ASC" },
    });
  }

  /**
   * Get a session by ID.
   */
  async getSession(sessionId: string): Promise<InboxSessionEntity> {
    const session = await this.sessionRepo.findOne({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException(`Session ${sessionId} not found`);
    }

    return session;
  }

  /**
   * Assign a session to an agent (lease-based: only one agent can accept).
   * Uses a transaction with SELECT FOR UPDATE so concurrent accepts result in
   * one success and one ConflictException ("already assigned").
   * Fires an `agent.handoff` analytics event after commit.
   */
  async assignSession(
    sessionId: string,
    agentId: string,
  ): Promise<InboxSessionEntity> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    let savedSession: InboxSessionEntity;

    try {
      const session = await queryRunner.manager
        .getRepository(InboxSessionEntity)
        .createQueryBuilder("s")
        .setLock("pessimistic_write")
        .where("s.id = :id", { id: sessionId })
        .getOne();

      if (!session) {
        throw new NotFoundException("Session not found");
      }

      if (session.status !== SessionStatus.UNASSIGNED) {
        throw new ConflictException(
          "This chat has already been assigned to another agent.",
        );
      }

      session.assignedAgentId = agentId;
      session.status = SessionStatus.ASSIGNED;
      session.assignedAt = new Date();
      savedSession = await queryRunner.manager
        .getRepository(InboxSessionEntity)
        .save(session);

      await queryRunner.commitTransaction();
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }

    // Fire agent.handoff event after commit (do not hold lock during I/O)
    try {
      await this.fireHandoffEvent(savedSession, agentId);
    } catch (error) {
      this.logger.error(`Failed to fire handoff event: ${error.message}`);
    }

    return savedSession;
  }

  /**
   * Fire an analytics event when a session is handed off to an agent.
   * This enables tracking of self-serve vs assisted journeys.
   */
  private async fireHandoffEvent(
    session: InboxSessionEntity,
    agentId: string,
  ): Promise<void> {
    const eventId = randomUUID();
    const context = (session.context as Record<string, unknown>) || {};

    const event: CreateEventDto = {
      eventId,
      messageId: eventId,
      tenantId: session.tenantId,
      projectId: "default", // Could be enhanced to track project
      eventName: "agent.handoff",
      eventType: "track",
      timestamp: new Date(),
      anonymousId: session.contactId, // Use contactId as identifier
      userId: session.contactId,
      sessionId: session.id, // InboxSession ID
      channelType: session.channel || "whatsapp",
      externalId: session.contactId,
      properties: {
        inboxSessionId: session.id,
        agentId,
        contactId: session.contactId,
        contactName: session.contactName,
        channel: session.channel,
        previousMode: "bot",
        newMode: "agent",
        handoffReason: context.issue ? "user_request" : "escalation",
        journeyStep: context.journeyStep || context.issue || "unknown",
        teamId: session.assignedTeamId,
        context,
      },
    };

    await this.eventRepository.save(event);
    this.logger.log(`Fired agent.handoff event for session ${session.id}`);
  }

  /**
   * Mark a session as resolved and create a Resolution record.
   * When the session's team has wrap-up enabled, use wrapUpData (custom fields). Otherwise use category/notes (default form).
   */
  async resolveSession(
    sessionId: string,
    agentId: string,
    data: {
      category?: string;
      notes?: string;
      outcome?: string;
      wrapUpData?: Record<string, string>;
    },
  ): Promise<InboxSessionEntity> {
    const session = await this.getSession(sessionId);

    // Verify the agent is assigned to this session
    if (session.assignedAgentId !== agentId) {
      throw new BadRequestException("You are not assigned to this session");
    }

    let team: TeamEntity | null = null;
    if (session.assignedTeamId) {
      team = await this.teamRepo.findOne({
        where: { id: session.assignedTeamId },
      });
    }

    const wrapUp = team?.wrapUpReport as
      | {
          enabled: boolean;
          mandatory: boolean;
          fields?: Array<{
            id: string;
            type: string;
            label: string;
            required: boolean;
            options?: Array<{ value: string; label: string }>;
          }>;
        }
      | null
      | undefined;

    const useTeamWrapUp = wrapUp?.enabled === true;
    const fields = Array.isArray(wrapUp?.fields) ? wrapUp.fields! : [];

    let category: string;
    let notes: string | undefined;
    let formData: Record<string, string | number | boolean> | null = null;

    if (useTeamWrapUp && data.wrapUpData !== undefined) {
      // Team wrap-up form: validate required fields and store formData
      for (const field of fields) {
        if (field.required) {
          const val = data.wrapUpData[field.id];
          if (val === undefined || String(val).trim() === "") {
            throw new BadRequestException(
              `Wrap-up field "${field.label}" is required.`,
            );
          }
        }
      }
      if (wrapUp.mandatory && Object.keys(data.wrapUpData).length === 0) {
        throw new BadRequestException(
          "Wrap-up report is required for this team. Please fill the form before resolving.",
        );
      }
      formData = data.wrapUpData as Record<string, string | number | boolean>;
      const firstSelect = fields.find((f) => f.type === "select");
      const firstTextarea = fields.find((f) => f.type === "textarea");
      category =
        (firstSelect && data.wrapUpData[firstSelect.id]
          ? String(data.wrapUpData[firstSelect.id]).trim()
          : "") || "custom";
      notes = firstTextarea
        ? (data.wrapUpData[firstTextarea.id] as string)?.trim() || undefined
        : undefined;
    } else {
      // Default form (no team wrap-up): category/notes from dto
      category =
        data.category && String(data.category).trim() !== ""
          ? data.category.trim()
          : "skipped";
      notes = data.notes?.trim() || undefined;
    }

    // Create Resolution record
    const resolution = this.resolutionRepo.create({
      sessionId,
      category,
      notes,
      outcome: data.outcome || "resolved",
      resolvedByAgentId: agentId,
      formData,
    });
    await this.resolutionRepo.save(resolution);

    // Update session status
    session.status = SessionStatus.RESOLVED;
    const savedSession = await this.sessionRepo.save(session);

    // Fire analytics event for chat resolution
    try {
      await this.fireResolutionEvent(savedSession, agentId, resolution);
    } catch (error) {
      this.logger.error(`Failed to fire resolution event: ${error.message}`);
    }

    // Send CSAT CTA link to the user (fire-and-forget; don't fail resolve if send fails)
    try {
      const result = await this.whatsappService.sendCsatCtaMessage(
        savedSession.tenantId,
        savedSession.contactId,
      );
      if (!result.success) {
        this.logger.warn(
          `CSAT CTA not sent for session ${sessionId}: ${result.error}`,
        );
      }
    } catch (error) {
      this.logger.warn(
        `Failed to send CSAT CTA for session ${sessionId}: ${(error as Error).message}`,
      );
    }

    this.logger.log(`Session ${sessionId} resolved by agent ${agentId}`);
    return savedSession;
  }

  /**
   * Fire an analytics event when a session is resolved.
   */
  private async fireResolutionEvent(
    session: InboxSessionEntity,
    agentId: string,
    resolution: ResolutionEntity,
  ): Promise<void> {
    const eventId = randomUUID();

    const event: CreateEventDto = {
      eventId,
      messageId: eventId,
      tenantId: session.tenantId,
      projectId: "default",
      eventName: "chat.resolved",
      eventType: "track",
      timestamp: new Date(),
      anonymousId: session.contactId,
      userId: session.contactId,
      sessionId: session.id,
      channelType: session.channel || "whatsapp",
      externalId: session.contactId,
      properties: {
        inboxSessionId: session.id,
        agentId,
        contactId: session.contactId,
        channel: session.channel,
        category: resolution.category,
        outcome: resolution.outcome,
        notes: resolution.notes,
      },
    };

    await this.eventRepository.save(event);
  }

  /**
   * Transfer a session to another agent.
   */
  async transferSession(
    sessionId: string,
    fromAgentId: string,
    toAgentId: string,
    reason?: string,
  ): Promise<InboxSessionEntity> {
    const session = await this.getSession(sessionId);

    // Verify the agent is assigned to this session
    if (session.assignedAgentId !== fromAgentId) {
      throw new BadRequestException("You are not assigned to this session");
    }

    // Verify session is not resolved
    if (session.status === SessionStatus.RESOLVED) {
      throw new BadRequestException("Cannot transfer a resolved session");
    }

    // Update the assigned agent
    const previousAgentId = session.assignedAgentId;
    session.assignedAgentId = toAgentId;

    // Store transfer info in context
    const context = (session.context as Record<string, unknown>) || {};
    const transfers =
      (context.transfers as Array<Record<string, unknown>>) || [];
    transfers.push({
      from: previousAgentId,
      to: toAgentId,
      reason,
      timestamp: new Date().toISOString(),
    });
    session.context = { ...context, transfers };

    const savedSession = await this.sessionRepo.save(session);

    // Fire analytics event for transfer
    try {
      await this.fireTransferEvent(
        savedSession,
        previousAgentId,
        toAgentId,
        reason,
      );
    } catch (error) {
      this.logger.error(`Failed to fire transfer event: ${error.message}`);
    }

    this.logger.log(
      `Session ${sessionId} transferred from ${previousAgentId} to ${toAgentId}`,
    );
    return savedSession;
  }

  /**
   * Fire an analytics event when a session is transferred.
   */
  private async fireTransferEvent(
    session: InboxSessionEntity,
    fromAgentId: string,
    toAgentId: string,
    reason?: string,
  ): Promise<void> {
    const eventId = randomUUID();

    const event: CreateEventDto = {
      eventId,
      messageId: eventId,
      tenantId: session.tenantId,
      projectId: "default",
      eventName: "chat.transferred",
      eventType: "track",
      timestamp: new Date(),
      anonymousId: session.contactId,
      userId: session.contactId,
      sessionId: session.id,
      channelType: session.channel || "whatsapp",
      externalId: session.contactId,
      properties: {
        inboxSessionId: session.id,
        fromAgentId,
        toAgentId,
        reason,
        contactId: session.contactId,
        channel: session.channel,
      },
    };

    await this.eventRepository.save(event);
  }

  /**
   * Get available agents for transfer (same tenant, excluding the current agent).
   */
  async getAvailableAgentsForTransfer(
    tenantId: string,
    excludeAgentId: string,
  ): Promise<Array<{ id: string; name: string; email: string }>> {
    // We'll query users from the tenant who have agent profiles
    // This requires joining with tenant_memberships table
    const result = await this.sessionRepo.manager.query(
      `
      SELECT DISTINCT u.id, u.name, u.email
      FROM users u
      INNER JOIN tenant_memberships tm ON tm."userId" = u.id
      WHERE tm."tenantId" = $1
        AND u.id != $2
      ORDER BY u.name
      `,
      [tenantId, excludeAgentId],
    );

    return result;
  }
}
