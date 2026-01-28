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
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, LessThan } from "typeorm";
import {
  InboxSessionEntity,
  SessionStatus,
  MessageEntity,
  MessageDirection,
  MessageType,
  ResolutionEntity,
  EventRepository,
  CreateEventDto,
} from "@lib/database";
import { randomUUID } from "crypto";

/**
 * Filter types for inbox queries
 */
export type InboxFilter = "all" | "pending" | "resolved" | "expired";

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
    private readonly eventRepository: EventRepository,
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
   * Assign a session to an agent.
   * Fires an `agent.handoff` analytics event to track self-serve vs assisted journeys.
   */
  async assignSession(
    sessionId: string,
    agentId: string,
  ): Promise<InboxSessionEntity> {
    const session = await this.getSession(sessionId);
    const wasUnassigned = session.status === SessionStatus.UNASSIGNED;

    session.assignedAgentId = agentId;
    session.status = SessionStatus.ASSIGNED;

    const savedSession = await this.sessionRepo.save(session);

    // Fire agent.handoff event for analytics tracking
    if (wasUnassigned) {
      try {
        await this.fireHandoffEvent(savedSession, agentId);
      } catch (error) {
        // Log but don't fail the assignment
        this.logger.error(`Failed to fire handoff event: ${error.message}`);
      }
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
   */
  async resolveSession(
    sessionId: string,
    agentId: string,
    data: {
      category: string;
      notes?: string;
      outcome?: string;
    },
  ): Promise<InboxSessionEntity> {
    const session = await this.getSession(sessionId);

    // Verify the agent is assigned to this session
    if (session.assignedAgentId !== agentId) {
      throw new BadRequestException("You are not assigned to this session");
    }

    // Create Resolution record
    const resolution = this.resolutionRepo.create({
      sessionId,
      category: data.category,
      notes: data.notes,
      outcome: data.outcome || "resolved",
      resolvedByAgentId: agentId,
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
