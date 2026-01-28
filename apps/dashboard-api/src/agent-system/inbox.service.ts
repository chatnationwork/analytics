/**
 * =============================================================================
 * INBOX SERVICE
 * =============================================================================
 *
 * Manages InboxSessions and Messages for the Agent System.
 * Provides methods to create sessions, add messages, and manage session state.
 */

import { Injectable, NotFoundException, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import {
  InboxSessionEntity,
  SessionStatus,
  MessageEntity,
  MessageDirection,
  MessageType,
  EventRepository,
  CreateEventDto,
} from "@lib/database";
import { randomUUID } from "crypto";

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
   * Returns sessions assigned to the agent, optionally filtered by status.
   */
  async getAgentInbox(
    tenantId: string,
    agentId: string,
    status?: SessionStatus,
  ): Promise<InboxSessionEntity[]> {
    const query = this.sessionRepo
      .createQueryBuilder("session")
      .where("session.tenantId = :tenantId", { tenantId })
      .andWhere("session.assignedAgentId = :agentId", { agentId });

    if (status) {
      query.andWhere("session.status = :status", { status });
    } else {
      // Default: only show active sessions (not resolved)
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
   * Mark a session as resolved.
   */
  async resolveSession(sessionId: string): Promise<InboxSessionEntity> {
    const session = await this.getSession(sessionId);

    session.status = SessionStatus.RESOLVED;

    return this.sessionRepo.save(session);
  }
}
