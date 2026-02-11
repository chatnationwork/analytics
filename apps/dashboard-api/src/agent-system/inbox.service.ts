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
import { Repository, LessThan, In } from "typeorm";
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
  normalizeContactIdDigits,
  InboxSessionHelper,
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

  private readonly sessionHelper: InboxSessionHelper;

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
  ) {
    this.sessionHelper = new InboxSessionHelper(
      this.sessionRepo,
      this.teamRepo,
    );
  }

  /**
   * Normalize phone for cross-tenant lookup: digits only (E.164 without +).
   * Used by hasActiveAgentSession so 254712345678 and +254712345678 match.
   */
  private normalizePhoneForLookup(phone: string): string {
    if (!phone || typeof phone !== "string") return "";
    return phone.trim().replace(/\D/g, "");
  }

  /**
   * Gets or creates a session for a contact.
   * Delegates to shared InboxSessionHelper for consistent normalization and dedup.
   */
  async getOrCreateSession(
    tenantId: string,
    contactId: string,
    contactName?: string,
    channel = "whatsapp",
    context?: Record<string, unknown>,
  ): Promise<InboxSessionEntity> {
    try {
      return await this.sessionHelper.getOrCreateSession(tenantId, contactId, {
        contactName,
        channel,
        context,
      });
    } catch (err) {
      if (
        err instanceof Error &&
        err.message === "contactId must contain at least one digit"
      ) {
        throw new BadRequestException(
          "contactId is required and must contain at least one digit",
        );
      }
      throw err;
    }
  }

  /**
   * Records a message in a session.
   * If no session exists, creates one first.
   */
  async addMessage(dto: CreateMessageDto): Promise<MessageEntity> {
    // Get or create session
    let session: InboxSessionEntity | null = null;
    if (dto.sessionId) {
      session = await this.sessionRepo.findOne({ where: { id: dto.sessionId } });
    }

    if (!session) {
      session = await this.getOrCreateSession(
        dto.tenantId,
        dto.contactId,
        dto.contactName,
        dto.channel || "whatsapp",
        dto.context,
      );
    }

    // Create message
    const message = this.messageRepo.create({
      contactId: session.contactId,
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

    const now = new Date();
    const updatePayload: Partial<InboxSessionEntity> = {
      lastMessageAt: now,
    };
    if (dto.direction === MessageDirection.INBOUND) {
      updatePayload.lastInboundMessageAt = now;
    }
    await this.sessionRepo.update(session.id, updatePayload);

    return savedMessage;
  }

  /**
   * Mark a session as read by the assigned agent (e.g. when they open the chat or send a message).
   * Used for unread indicator: hasUnread = lastInboundMessageAt > lastReadAt.
   */
  async markSessionAsRead(sessionId: string): Promise<void> {
    await this.sessionRepo.update(sessionId, {
      lastReadAt: new Date(),
    });
  }

  /**
   * Get inbox sessions for an agent.
   * Filter semantics:
   * - 'assigned': Assigned to agent but not yet accepted (acceptedAt IS NULL)
   * - 'pending' (active): Assigned, accepted, and open (last message within 24h)
   * - 'resolved': RESOLVED (optionally only since resolvedSince; null = all time)
   * - 'expired': ASSIGNED with lastMessageAt > 24h ago
   * - 'all': All assigned to agent except resolved (assigned + active + expired)
   */
  async getAgentInbox(
    tenantId: string,
    agentId: string,
    filter?: InboxFilter,
    resolvedSince?: Date | null,
  ): Promise<InboxSessionEntity[]> {
    const query = this.sessionRepo
      .createQueryBuilder("session")
      .where("session.tenantId = :tenantId", { tenantId })
      .andWhere("session.assignedAgentId = :agentId", { agentId });

    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    switch (filter) {
      case "assigned":
        // Assigned but not yet accepted
        query.andWhere("session.status = :status", {
          status: SessionStatus.ASSIGNED,
        });
        query.andWhere("session.acceptedAt IS NULL");
        break;
      case "pending":
        // Active: assigned, accepted, not expired
        query.andWhere("session.status = :status", {
          status: SessionStatus.ASSIGNED,
        });
        query.andWhere("session.acceptedAt IS NOT NULL");
        query.andWhere(
          "(session.lastMessageAt IS NULL OR session.lastMessageAt > :cutoff)",
          { cutoff: twentyFourHoursAgo },
        );
        break;
      case "resolved":
        query.andWhere("session.status = :status", {
          status: SessionStatus.RESOLVED,
        });
        if (resolvedSince != null) {
          query.andWhere("session.updatedAt >= :resolvedSince", {
            resolvedSince,
          });
        }
        break;
      case "expired":
        query.andWhere("session.status = :status", {
          status: SessionStatus.ASSIGNED,
        });
        query.andWhere("session.lastMessageAt <= :cutoff", {
          cutoff: twentyFourHoursAgo,
        });
        break;
      case "all":
        // All assigned to agent except resolved
        query.andWhere("session.status != :resolved", {
          resolved: SessionStatus.RESOLVED,
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
   * Get counts per filter for the agent inbox (for filter badge UI).
   * Each count uses a fresh query to avoid clone/parameter sharing issues.
   * resolvedSince: when set, resolved count only includes sessions resolved on or after this date.
   */
  async getAgentInboxCounts(
    tenantId: string,
    agentId: string,
    resolvedSince?: Date | null,
  ): Promise<{
    assigned: number;
    active: number;
    resolved: number;
    expired: number;
  }> {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [assigned, active, resolved, expired] = await Promise.all([
      this.sessionRepo
        .createQueryBuilder("session")
        .where("session.tenantId = :tenantId", { tenantId })
        .andWhere("session.assignedAgentId = :agentId", { agentId })
        .andWhere("session.status = :status", {
          status: SessionStatus.ASSIGNED,
        })
        .andWhere("session.acceptedAt IS NULL")
        .getCount(),
      this.sessionRepo
        .createQueryBuilder("session")
        .where("session.tenantId = :tenantId", { tenantId })
        .andWhere("session.assignedAgentId = :agentId", { agentId })
        .andWhere("session.status = :status", {
          status: SessionStatus.ASSIGNED,
        })
        .andWhere("session.acceptedAt IS NOT NULL")
        .andWhere(
          "(session.lastMessageAt IS NULL OR session.lastMessageAt > :cutoff)",
          { cutoff: twentyFourHoursAgo },
        )
        .getCount(),
      (() => {
        const q = this.sessionRepo
          .createQueryBuilder("session")
          .where("session.tenantId = :tenantId", { tenantId })
          .andWhere("session.assignedAgentId = :agentId", { agentId })
          .andWhere("session.status = :status", {
            status: SessionStatus.RESOLVED,
          });
        if (resolvedSince != null) {
          q.andWhere("session.updatedAt >= :resolvedSince", {
            resolvedSince,
          });
        }
        return q.getCount();
      })(),
      this.sessionRepo
        .createQueryBuilder("session")
        .where("session.tenantId = :tenantId", { tenantId })
        .andWhere("session.assignedAgentId = :agentId", { agentId })
        .andWhere("session.status = :status", {
          status: SessionStatus.ASSIGNED,
        })
        .andWhere("session.lastMessageAt <= :cutoff", {
          cutoff: twentyFourHoursAgo,
        })
        .getCount(),
    ]);

    return {
      assigned: Number(assigned) || 0,
      active: Number(active) || 0,
      resolved: Number(resolved) || 0,
      expired: Number(expired) || 0,
    };
  }

  /**
   * Get counts per filter for the tenant inbox (admin view).
   * Each count uses a fresh query to avoid clone/parameter sharing issues.
   * resolvedSince: when set, resolved count only includes sessions resolved on or after this date.
   */
  async getTenantInboxCounts(
    tenantId: string,
    resolvedSince?: Date | null,
  ): Promise<{
    all: number;
    assigned: number;
    unassigned: number;
    active: number;
    resolved: number;
    expired: number;
  }> {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [all, assigned, unassigned, active, resolved, expired] =
      await Promise.all([
        this.sessionRepo
          .createQueryBuilder("session")
          .where("session.tenantId = :tenantId", { tenantId })
          .andWhere("session.status != :resolved", {
            resolved: SessionStatus.RESOLVED,
          })
          .getCount(),
        this.sessionRepo
          .createQueryBuilder("session")
          .where("session.tenantId = :tenantId", { tenantId })
          .andWhere("session.status = :status", {
            status: SessionStatus.ASSIGNED,
          })
          .andWhere("session.acceptedAt IS NULL")
          .getCount(),
        this.sessionRepo
          .createQueryBuilder("session")
          .where("session.tenantId = :tenantId", { tenantId })
          .andWhere("session.status = :status", {
            status: SessionStatus.UNASSIGNED,
          })
          .getCount(),
        this.sessionRepo
          .createQueryBuilder("session")
          .where("session.tenantId = :tenantId", { tenantId })
          .andWhere("session.status = :status", {
            status: SessionStatus.ASSIGNED,
          })
          .andWhere("session.acceptedAt IS NOT NULL")
          .andWhere(
            "(session.lastMessageAt IS NULL OR session.lastMessageAt > :cutoff)",
            { cutoff: twentyFourHoursAgo },
          )
          .getCount(),
        (() => {
          const q = this.sessionRepo
            .createQueryBuilder("session")
            .where("session.tenantId = :tenantId", { tenantId })
            .andWhere("session.status = :status", {
              status: SessionStatus.RESOLVED,
            });
          if (resolvedSince != null) {
            q.andWhere("session.updatedAt >= :resolvedSince", {
              resolvedSince,
            });
          }
          return q.getCount();
        })(),
        this.sessionRepo
          .createQueryBuilder("session")
          .where("session.tenantId = :tenantId", { tenantId })
          .andWhere("session.status = :status", {
            status: SessionStatus.ASSIGNED,
          })
          .andWhere("session.lastMessageAt <= :cutoff", {
            cutoff: twentyFourHoursAgo,
          })
          .getCount(),
      ]);

    return {
      all: Number(all) || 0,
      assigned: Number(assigned) || 0,
      unassigned: Number(unassigned) || 0,
      active: Number(active) || 0,
      resolved: Number(resolved) || 0,
      expired: Number(expired) || 0,
    };
  }

  /**
   * Get all inbox sessions for a tenant (assigned and unassigned).
   * Used when the user has session.view_all (e.g. super admin).
   * - 'all': Excludes resolved so the same contact does not appear multiple times.
   * - 'assigned': Assigned but not yet accepted (acceptedAt IS NULL).
   * - 'pending' (active): Assigned, accepted, not expired.
   */
  async getTenantInbox(
    tenantId: string,
    filter?: InboxFilter,
    resolvedSince?: Date | null,
  ): Promise<InboxSessionEntity[]> {
    const query = this.sessionRepo
      .createQueryBuilder("session")
      .where("session.tenantId = :tenantId", { tenantId });

    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    switch (filter) {
      case "all":
        // Exclude resolved to avoid same user appearing multiple times
        query.andWhere("session.status != :resolved", {
          resolved: SessionStatus.RESOLVED,
        });
        break;
      case "assigned":
        query.andWhere("session.status = :status", {
          status: SessionStatus.ASSIGNED,
        });
        query.andWhere("session.acceptedAt IS NULL");
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
        query.andWhere("session.acceptedAt IS NOT NULL");
        query.andWhere(
          "(session.lastMessageAt IS NULL OR session.lastMessageAt > :cutoff)",
          { cutoff: twentyFourHoursAgo },
        );
        break;
      case "resolved":
        query.andWhere("session.status = :status", {
          status: SessionStatus.RESOLVED,
        });
        if (resolvedSince != null) {
          query.andWhere("session.updatedAt >= :resolvedSince", {
            resolvedSince,
          });
        }
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
   * When teamId is provided: returns sessions for that team OR sessions with no team (assignedTeamId IS NULL),
   * so sessions created by e.g. webhook_sync (processor) can be assigned when "Assign queue" is run for a team.
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
      query.andWhere(
        "(session.assignedTeamId = :teamId OR session.assignedTeamId IS NULL)",
        { teamId },
      );
    }

    query.orderBy("session.createdAt", "ASC");

    return query.getMany();
  }

  /**
   * Get messages for a session (returns full contact history).
   * Since messages are tied to the contact, a session is just a view into that history.
   */
  async getSessionMessages(sessionId: string): Promise<MessageEntity[]> {
    const session = await this.sessionRepo.findOne({
      where: { id: sessionId },
    });
    if (!session) {
      throw new NotFoundException(`Session ${sessionId} not found`);
    }

    return this.messageRepo.find({
      where: {
        tenantId: session.tenantId,
        contactId: session.contactId,
      },
      order: { createdAt: "ASC" },
    });
  }

  /**
   * Get full chat history for a contact.
   */
  async getMessagesForContact(
    tenantId: string,
    contactId: string,
  ): Promise<MessageEntity[]> {
    const normalizedContactId = normalizeContactIdDigits(contactId);
    if (!normalizedContactId) return [];

    return this.messageRepo.find({
      where: { tenantId, contactId: normalizedContactId },
      order: { createdAt: "ASC" },
    });
  }

  /**
   * Returns true if the given phone/contact has an active agent session (status = ASSIGNED).
   * Used by external systems (e.g. Tax Agent) to check if a user is already in a live agent chat.
   * @param phone - E.164-style identifier (digits, optional leading +); normalized for lookup.
   * @param tenantId - If provided, scope to this tenant; otherwise checks across all tenants.
   */
  async hasActiveAgentSession(
    phone: string,
    tenantId?: string,
  ): Promise<boolean> {
    const normalized = this.normalizePhoneForLookup(phone);
    if (!normalized) return false;
    if (tenantId) {
      return this.contactHasAssignedSession(tenantId, normalized);
    }
    const session = await this.sessionRepo.findOne({
      where: { contactId: normalized, status: SessionStatus.ASSIGNED },
      select: { id: true },
    });
    return !!session;
  }

  /**
   * True if this contact already has an ASSIGNED session (optionally excluding one session id).
   * Used to avoid assigning a second session to an agent when the contact is already in an active chat.
   */
  async contactHasAssignedSession(
    tenantId: string,
    contactId: string,
    excludeSessionId?: string,
  ): Promise<boolean> {
    const normalizedContactId = normalizeContactIdDigits(contactId);
    const qb = this.sessionRepo
      .createQueryBuilder("session")
      .where("session.tenantId = :tenantId", { tenantId })
      .andWhere("session.contactId = :contactId", {
        contactId: normalizedContactId,
      })
      .andWhere("session.status = :status", {
        status: SessionStatus.ASSIGNED,
      });
    if (excludeSessionId) {
      qb.andWhere("session.id != :excludeSessionId", { excludeSessionId });
    }
    const count = await qb.getCount();
    return count > 0;
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
   * - If unassigned: assigns to the agent and fires `agent.handoff`.
   * - If already assigned to another agent: treats accept as a takeover (transfer
   *   from current agent to accepter), records it in context as a self-transfer
   *   (reason: "takeover", isTakeover: true) and fires `chat.transferred`, so
   *   the accepter becomes the owner and can resolve. Enables sys admins (or
   *   any agent with visibility) to take over a chat and resolve it.
   */
  /**
   * @param assignedTeamId Optional. When assigning from unassigned, set session.assignedTeamId (e.g. for manual queue assign).
   */
  async assignSession(
    sessionId: string,
    agentId: string,
    assignedTeamId?: string | null,
  ): Promise<InboxSessionEntity> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    let savedSession: InboxSessionEntity;
    let didTakeover = false;
    let didAssignFromUnassigned = false;
    let previousAgentId: string | null = null;

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

      if (session.status === SessionStatus.RESOLVED) {
        throw new BadRequestException("Cannot accept a resolved session");
      }

      if (session.status === SessionStatus.UNASSIGNED) {
        session.assignedAgentId = agentId;
        if (assignedTeamId) session.assignedTeamId = assignedTeamId;
        session.status = SessionStatus.ASSIGNED;
        session.assignedAt = new Date();
        session.acceptedAt = new Date();
        didAssignFromUnassigned = true;
      } else if (session.assignedAgentId === agentId) {
        // Already assigned to this agent; idempotent for ownership,
        // but we still treat this as an explicit accept for metrics if not already accepted.
        if (!session.acceptedAt) {
          session.acceptedAt = new Date();
        }
      } else {
        // Already assigned to another agent: treat as takeover (transfer to accepter)
        previousAgentId = session.assignedAgentId;
        session.assignedAgentId = agentId;
        session.assignedAt = new Date();
        session.acceptedAt = new Date();
        const context = (session.context as Record<string, unknown>) || {};
        const transfers =
          (context.transfers as Array<Record<string, unknown>>) || [];
        transfers.push({
          from: previousAgentId,
          to: agentId,
          reason: "takeover",
          isTakeover: true,
          timestamp: new Date().toISOString(),
        });
        session.context = { ...context, transfers };
        didTakeover = true;
      }

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

    // Fire analytics event after commit (do not hold lock during I/O)
    try {
      if (didTakeover && previousAgentId) {
        await this.fireTransferEvent(
          savedSession,
          previousAgentId,
          agentId,
          "takeover",
        );
        this.logger.log(
          `Session ${sessionId} taken over from ${previousAgentId} by ${agentId}`,
        );
      } else if (didAssignFromUnassigned) {
        await this.fireHandoffEvent(savedSession, agentId);
      }
    } catch (error) {
      this.logger.error(
        `Failed to fire handoff/transfer event: ${error.message}`,
      );
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

    // Fall back to the default team's wrap-up config when session has no team
    // (e.g. system admin accepting an unrouted chat)
    if (!team) {
      team = await this.teamRepo.findOne({
        where: { isDefault: true },
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

    const fields = Array.isArray(wrapUp?.fields) ? wrapUp.fields! : [];
    // Only enforce team wrap-up when enabled AND fields are actually configured;
    // an empty fields list with mandatory=true is a misconfiguration.
    const useTeamWrapUp = wrapUp?.enabled === true && fields.length > 0;

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

    // Use a transaction to ensure atomicity (create resolution + update session status)
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    let savedSession: InboxSessionEntity;

    try {
      // Check if resolution already exists (handle "zombie" resolution from previous failure)
      let resolution = await queryRunner.manager.findOne(ResolutionEntity, {
        where: { sessionId },
      });

      if (resolution) {
        this.logger.warn(
          `Resolution found for active session ${sessionId} (zombie record). Updating existing resolution.`,
        );
        // Update existing resolution
        resolution.category = category;
        resolution.notes = notes ?? "";
        resolution.outcome = data.outcome || "resolved";
        resolution.resolvedByAgentId = agentId;
        resolution.formData = formData;
      } else {
        // Create new Resolution record
        resolution = queryRunner.manager.create(ResolutionEntity, {
          sessionId,
          category,
          notes,
          outcome: data.outcome || "resolved",
          resolvedByAgentId: agentId,
          formData,
        });
      }

      await queryRunner.manager.save(ResolutionEntity, resolution);

      // Update session status
      session.status = SessionStatus.RESOLVED;
      savedSession = await queryRunner.manager.save(InboxSessionEntity, session);

      await queryRunner.commitTransaction();
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }

    // Fire analytics event for chat resolution
    try {
      const resolution = await this.resolutionRepo.findOne({
        where: { sessionId: savedSession.id },
      });
      if (resolution) {
        await this.fireResolutionEvent(savedSession, agentId, resolution);
      }
    } catch (error) {
      this.logger.error(`Failed to fire resolution event: ${error.message}`);
    }

    // Send CSAT CTA link to the user (fire-and-forget; don't fail resolve if send fails)
    try {
      const account = (savedSession.context as Record<string, unknown>)
        ?.account as string | undefined;
      const result = await this.whatsappService.sendCsatCtaMessage(
        savedSession.tenantId,
        savedSession.contactId,
        { account },
      );
      if (!result.success) {
        this.logger.warn(
          `CSAT CTA not sent for session ${sessionId}: ${result.error}`,
        );
      } else {
        // Record CSAT message as sent by agent
        await this.addMessage({
          sessionId: savedSession.id,
          tenantId: savedSession.tenantId,
          contactId: savedSession.contactId,
          direction: MessageDirection.OUTBOUND,
          type: MessageType.TEXT,
          content: result.payload?.interactive?.body?.text,
          metadata: {
            interactive: result.payload?.interactive,
            sent_by_system: true,
          },
          senderId: agentId,
        }).catch((err) =>
          this.logger.warn(
            `Failed to record CSAT message for session ${sessionId}: ${err.message}`,
          ),
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

    // Resolution time = accept → resolved (or assign → resolved if acceptedAt missing)
    const acceptedAt = session.acceptedAt ?? session.assignedAt;
    const resolutionTimeSeconds =
      acceptedAt && resolution.createdAt
        ? (resolution.createdAt.getTime() - acceptedAt.getTime()) / 1000
        : undefined;

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
        ...(resolutionTimeSeconds != null && resolutionTimeSeconds >= 0
          ? { resolution_time_seconds: resolutionTimeSeconds }
          : {}),
      },
    };

    await this.eventRepository.save(event);
  }

  /**
   * Transfer a session to another agent.
   * When allowTransferIfNotAssigned is true (e.g. user has session.view_all), any user with transfer permission can transfer the chat.
   */
  async transferSession(
    sessionId: string,
    fromAgentId: string,
    toAgentId: string,
    reason?: string,
    allowTransferIfNotAssigned = false,
  ): Promise<InboxSessionEntity> {
    const session = await this.getSession(sessionId);

    // Verify the agent is assigned to this session (or caller has permission to transfer any chat, e.g. super admin)
    const isAssigned = session.assignedAgentId === fromAgentId;
    if (!isAssigned && !allowTransferIfNotAssigned) {
      throw new BadRequestException("You are not assigned to this session");
    }

    // Verify session is not resolved
    if (session.status === SessionStatus.RESOLVED) {
      throw new BadRequestException("Cannot transfer a resolved session");
    }

    // Update the assigned agent
    const previousAgentId = session.assignedAgentId;
    session.assignedAgentId = toAgentId;
    // New owner must explicitly accept; clear acceptedAt
    session.acceptedAt = null;

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
        previousAgentId ?? fromAgentId,
        toAgentId,
        reason,
      );
    } catch (error) {
      this.logger.error(`Failed to fire transfer event: ${error.message}`);
    }

    this.logger.log(
      `Session ${sessionId} transferred from ${previousAgentId ?? fromAgentId} to ${toAgentId}`,
    );
    return savedSession;
  }

  /**
   * Bulk transfer multiple sessions to one agent or to a team queue.
   * Caller must have session.bulk_transfer permission; no requirement to be the assigned agent.
   * Resolved sessions are skipped; only sessions in the same tenant are transferred.
   * Exactly one of toAgentId or toTeamId must be set.
   */
  async bulkTransferSessions(
    tenantId: string,
    sessionIds: string[],
    initiatorId: string,
    toAgentId: string | undefined,
    toTeamId: string | undefined,
    reason?: string,
  ): Promise<{
    transferred: number;
    errors: Array<{ sessionId: string; message: string }>;
  }> {
    const errors: Array<{ sessionId: string; message: string }> = [];
    let transferred = 0;
    const toTeam = !!toTeamId;

    if (toTeam && toTeamId) {
      const team = await this.teamRepo.findOne({
        where: { id: toTeamId, tenantId },
      });
      if (!team) {
        return {
          transferred: 0,
          errors: [{ sessionId: "", message: "Target team not found" }],
        };
      }
    }

    for (const sessionId of sessionIds) {
      try {
        const session = await this.getSession(sessionId);
        if (session.tenantId !== tenantId) {
          errors.push({ sessionId, message: "Session not in tenant" });
          continue;
        }
        if (session.status === SessionStatus.RESOLVED) {
          errors.push({
            sessionId,
            message: "Cannot transfer resolved session",
          });
          continue;
        }

        const previousAgentId = session.assignedAgentId;
        const previousTeamId = session.assignedTeamId;

        if (toTeam && toTeamId) {
          session.assignedTeamId = toTeamId;
          session.assignedAgentId = null;
        } else if (toAgentId) {
          session.assignedAgentId = toAgentId;
          // Keep assignedTeamId as-is; agent belongs to a team
        }
        session.acceptedAt = null;

        const context = (session.context as Record<string, unknown>) || {};
        const transfers =
          (context.transfers as Array<Record<string, unknown>>) || [];
        transfers.push({
          from: previousAgentId,
          to: toTeam ? null : toAgentId,
          toTeamId: toTeam ? toTeamId : undefined,
          fromTeamId: previousTeamId,
          reason: reason ?? "bulk_transfer",
          timestamp: new Date().toISOString(),
        });
        session.context = { ...context, transfers };

        await this.sessionRepo.save(session);

        try {
          await this.fireTransferEvent(
            session,
            previousAgentId ?? initiatorId,
            toTeam ? undefined : toAgentId,
            reason ?? "bulk_transfer",
            toTeam ? toTeamId : undefined,
          );
        } catch (err) {
          this.logger.warn(
            `Failed to fire bulk transfer event for ${sessionId}: ${(err as Error).message}`,
          );
        }

        transferred++;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        errors.push({ sessionId, message });
      }
    }

    if (transferred > 0) {
      const target = toTeam ? `team ${toTeamId}` : `agent ${toAgentId}`;
      this.logger.log(
        `Bulk transfer: ${transferred} session(s) to ${target} by ${initiatorId}`,
      );
    }

    return { transferred, errors };
  }

  /**
   * Fire an analytics event when a session is transferred.
   * When reason is "takeover", properties include isTakeover: true for analytics.
   * When transferring to team, toAgentId is undefined and toTeamId is set.
   */
  private async fireTransferEvent(
    session: InboxSessionEntity,
    fromAgentId: string,
    toAgentId: string | undefined,
    reason?: string,
    toTeamId?: string,
  ): Promise<void> {
    const eventId = randomUUID();
    const isTakeover = reason === "takeover";

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
        ...(toAgentId != null && { toAgentId }),
        ...(toTeamId != null && { toTeamId }),
        reason,
        isTakeover,
        contactId: session.contactId,
        channel: session.channel,
      },
    };

    await this.eventRepository.save(event);
  }

  /**
   * Get assigned, non-resolved sessions that have been inactive for at least olderThanDays,
   * or within a custom date range when provided.
   * Used for mass reengagement: "chats expired for at least N days" or within a date window.
   * When dateRange is provided it takes precedence over olderThanDays.
   */
  async getExpiredSessionsForReengagement(
    tenantId: string,
    olderThanDays: number,
    dateRange?: { startDate: Date; endDate: Date },
  ): Promise<InboxSessionEntity[]> {
    const query = this.sessionRepo
      .createQueryBuilder("session")
      .where("session.tenantId = :tenantId", { tenantId })
      .andWhere("session.status = :status", {
        status: SessionStatus.ASSIGNED,
      });

    if (dateRange) {
      // Custom date range: filter sessions whose lastMessageAt falls between start and end
      query.andWhere(
        "(session.lastMessageAt IS NOT NULL AND session.lastMessageAt >= :start AND session.lastMessageAt <= :end)",
        { start: dateRange.startDate, end: dateRange.endDate },
      );
    } else {
      // Default: sessions inactive for at least N days
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - Math.max(1, olderThanDays));
      cutoff.setHours(0, 0, 0, 0);
      query.andWhere(
        "(session.lastMessageAt IS NULL OR session.lastMessageAt <= :cutoff)",
        { cutoff },
      );
    }

    return query.orderBy("session.lastMessageAt", "ASC").getMany();
  }

  /**
   * Send reengagement template to multiple expired sessions (mass reengagement).
   * Sessions are those assigned and inactive for at least olderThanDays, or within a custom date range.
   * Caller must have session.bulk_transfer permission.
   */
  async bulkReengageSessions(
    tenantId: string,
    initiatorId: string,
    olderThanDays: number,
    dateRange?: { startDate: Date; endDate: Date },
  ): Promise<{
    sent: number;
    errors: Array<{ sessionId: string; message: string }>;
  }> {
    const sessions =
      await this.getExpiredSessionsForReengagement(tenantId, olderThanDays, dateRange);
    const errors: Array<{ sessionId: string; message: string }> = [];
    let sent = 0;

    for (const session of sessions) {
      try {
        const account = (session.context as Record<string, unknown>)?.account as
          | string
          | undefined;
        const contactName =
          (session.contactName ?? "")?.trim() || session.contactId || "there";

        const result = await this.whatsappService.sendReengagementTemplate(
          tenantId,
          session.contactId,
          contactName,
          { account },
        );

        if (!result.success) {
          errors.push({
            sessionId: session.id,
            message: result.error ?? "Failed to send reengagement",
          });
          continue;
        }

        // Record reengagement message
        await this.addMessage({
          sessionId: session.id,
          tenantId: tenantId,
          contactId: session.contactId,
          direction: MessageDirection.OUTBOUND,
          type: MessageType.TEMPLATE,
          content: `Sent re-engagement template to ${contactName}`,
          metadata: {
            template: result.payload?.template,
            sent_by_system: true,
            reengagement: true,
          },
          senderId: initiatorId,
        }).catch((err) =>
          this.logger.warn(
            `Failed to record reengagement message for session ${session.id}: ${err.message}`,
          ),
        );

        sent++;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        errors.push({ sessionId: session.id, message });
      }
    }

    if (sent > 0) {
      const rangeDesc = dateRange
        ? `between ${dateRange.startDate.toISOString().slice(0, 10)} and ${dateRange.endDate.toISOString().slice(0, 10)}`
        : `inactive ≥${olderThanDays} day(s)`;
      this.logger.log(
        `Bulk reengagement: ${sent} template(s) sent for sessions ${rangeDesc} by ${initiatorId}`,
      );
    }

    return { sent, errors };
  }

  /**
   * Get available agents for transfer (same tenant, excluding the current agent).
   * When availableOnly is true, only returns agents who are online (agent_profiles.status = 'online').
   * Only returns users with role = 'agent' so admins, developers, and auditors are excluded.
   */
  async getAvailableAgentsForTransfer(
    tenantId: string,
    excludeAgentId: string,
    options?: { availableOnly?: boolean },
  ): Promise<Array<{ id: string; name: string; email: string; role: string }>> {
    if (options?.availableOnly) {
      const result = await this.sessionRepo.manager.query(
        `
        SELECT DISTINCT u.id, u.name, u.email, tm.role
        FROM users u
        INNER JOIN tenant_memberships tm ON tm."userId" = u.id
        INNER JOIN agent_profiles ap ON ap."userId" = u.id
        WHERE tm."tenantId" = $1
          AND u.id != $2
          AND ap.status = 'online'
          AND tm.role = 'agent'
        ORDER BY u.name
        `,
        [tenantId, excludeAgentId],
      );
      return result;
    }

    const result = await this.sessionRepo.manager.query(
      `
      SELECT DISTINCT u.id, u.name, u.email, tm.role
      FROM users u
      INNER JOIN tenant_memberships tm ON tm."userId" = u.id
      WHERE tm."tenantId" = $1
        AND u.id != $2
        AND tm.role = 'agent'
      ORDER BY u.name
      `,
      [tenantId, excludeAgentId],
    );

    return result;
  }
}
