/**
 * =============================================================================
 * AGENT INBOX CONTROLLER
 * =============================================================================
 *
 * API endpoints for agents to manage their inbox.
 * - View assigned chats
 * - Send messages
 * - Resolve conversations
 */

import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  Request,
  Req,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { InboxService, InboxFilter } from "./inbox.service";
import { AssignmentService } from "./assignment.service";
import { PresenceService } from "./presence.service";
import {
  WhatsappService,
  WhatsAppSendPayload,
} from "../whatsapp/whatsapp.service";
import { MessageDirection, MessageType, Permission } from "@lib/database";
import { AuditService, AuditActions } from "../audit/audit.service";
import { getRequestContext, type RequestLike } from "../request-context";

/**
 * DTO for sending a message as an agent.
 * Supports text, image, video, audio, document, location (WhatsApp Cloud API format via CRM).
 */
interface SendMessageDto {
  /** Text body (type=text) or caption (image/video/document) */
  content?: string;
  type?: "text" | "image" | "video" | "audio" | "document" | "location";
  metadata?: Record<string, unknown>;
  /** For image/video/audio/document: public URL (upload to our server, use link for WhatsApp) */
  media_url?: string;
  /** For document: optional filename */
  filename?: string;
  /** For location */
  latitude?: string | number;
  longitude?: string | number;
  name?: string;
  address?: string;
}

/**
 * DTO for resolving a session.
 * Use category/notes for legacy/default form, or wrapUpData when team uses custom wrap-up fields.
 */
interface ResolveSessionDto {
  category?: string;
  notes?: string;
  outcome?: string;
  /** Dynamic field values (field id -> value) when team uses custom wrap-up fields */
  wrapUpData?: Record<string, string>;
}

/**
 * DTO for transferring a session to another agent
 */
interface TransferSessionDto {
  targetAgentId: string;
  reason?: string;
}

/** DTO for presence (go online/offline). reason = display label (e.g. available, busy, off_shift). */
interface PresenceDto {
  status: "online" | "offline";
  reason?: string | null;
}

/**
 * Controller for agent inbox operations.
 * All endpoints require authentication via JWT.
 */
@Controller("agent/inbox")
@UseGuards(JwtAuthGuard)
export class AgentInboxController {
  constructor(
    private readonly inboxService: InboxService,
    private readonly assignmentService: AssignmentService,
    private readonly presenceService: PresenceService,
    private readonly whatsappService: WhatsappService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Get the current agent's inbox (assigned chats)
   * Filter options:
   * - 'all': All sessions assigned to the agent
   * - 'pending': Active sessions not resolved
   * - 'resolved': Resolved sessions
   * - 'expired': Sessions with no activity for 24+ hours
   */
  @Get()
  async getInbox(
    @Request()
    req: {
      user: {
        id: string;
        tenantId: string;
        permissions?: { global?: string[] };
      };
    },
    @Query("filter") filter?: InboxFilter,
  ) {
    const canViewAll =
      req.user.permissions?.global?.includes(
        Permission.SESSION_VIEW_ALL as string,
      ) ?? false;
    if (canViewAll) {
      return this.inboxService.getTenantInbox(req.user.tenantId, filter);
    }
    return this.inboxService.getAgentInbox(
      req.user.tenantId,
      req.user.id,
      filter,
    );
  }

  /**
   * Get current agent presence and reason (for header status dropdown).
   */
  @Get("presence")
  async getPresence(
    @Request() req: { user: { id: string; tenantId: string } },
  ): Promise<{ status: "online" | "offline"; reason: string | null }> {
    return this.presenceService.getStatus(req.user.tenantId, req.user.id);
  }

  /**
   * Set agent presence (online/offline) and optional reason (e.g. available, busy, off_shift).
   * Creates/ends agent_sessions and updates agent_profiles.status and statusReason.
   */
  @Post("presence")
  async setPresence(
    @Request() req: { user: { id: string; tenantId: string } },
    @Body() dto: PresenceDto,
  ) {
    const reason =
      dto.reason != null && String(dto.reason).trim() !== ""
        ? String(dto.reason).trim()
        : undefined;
    if (dto.status === "online") {
      return this.presenceService.goOnline(
        req.user.tenantId,
        req.user.id,
        reason,
      );
    }
    return this.presenceService.goOffline(
      req.user.tenantId,
      req.user.id,
      reason,
    );
  }

  /**
   * Get unassigned chats in the queue
   */
  @Get("unassigned")
  async getUnassigned(
    @Request() req: { user: { tenantId: string } },
    @Query("teamId") teamId?: string,
  ) {
    return this.inboxService.getUnassignedSessions(req.user.tenantId, teamId);
  }

  /**
   * Assign queued (unassigned) sessions to available agents.
   * Optional teamId: only assign sessions for that team; otherwise all unassigned for tenant.
   */
  @Post("assign-queue")
  async assignQueue(
    @Request() req: { user: { tenantId: string } },
    @Query("teamId") teamId?: string,
  ) {
    return this.assignmentService.assignQueuedSessionsToAvailableAgents(
      req.user.tenantId,
      { teamId },
    );
  }

  /**
   * Get a specific session with its messages.
   * Messages are returned for the entire contact (all sessions for this contact)
   * so that every inbox row for the same contact shows full chat history.
   */
  @Get(":sessionId")
  async getSession(@Param("sessionId") sessionId: string) {
    const session = await this.inboxService.getSession(sessionId);
    const messages = await this.inboxService.getMessagesForContact(
      session.tenantId,
      session.contactId,
    );

    // Return plain object; ResponseInterceptor wraps it in { status, data, timestamp }
    return {
      session,
      messages,
    };
  }

  /**
   * Send a message in a session (text, image, video, audio, document, location).
   * Uses WhatsApp Cloud API format; request is sent to CRM endpoint.
   */
  @Post(":sessionId/message")
  async sendMessage(
    @Request() req: { user: { id: string; tenantId: string } },
    @Param("sessionId") sessionId: string,
    @Body() dto: SendMessageDto,
  ) {
    const session = await this.inboxService.getSession(sessionId);
    const account = (session.context as Record<string, unknown>)?.account as
      | string
      | undefined;

    const payload = this.buildWhatsAppPayload(dto);
    await this.whatsappService.sendMessage(
      req.user.tenantId,
      session.contactId,
      payload,
      { account },
    );

    const { type, content, metadata } = this.messageDisplayFromDto(dto);
    return this.inboxService.addMessage({
      sessionId,
      tenantId: req.user.tenantId,
      contactId: session.contactId,
      direction: MessageDirection.OUTBOUND,
      type,
      content,
      metadata: { ...dto.metadata, ...metadata },
      senderId: req.user.id,
    });
  }

  private buildWhatsAppPayload(dto: SendMessageDto): WhatsAppSendPayload {
    const type = dto.type || "text";
    const content = (dto.content ?? "").trim();

    if (type === "text") {
      return {
        type: "text",
        text: { body: content || "(empty)", preview_url: false },
      };
    }
    if (type === "image" && dto.media_url) {
      return {
        type: "image",
        image: { link: dto.media_url, caption: content || undefined },
      };
    }
    if (type === "video" && dto.media_url) {
      return {
        type: "video",
        video: { link: dto.media_url, caption: content || undefined },
      };
    }
    if (type === "audio" && dto.media_url) {
      return { type: "audio", audio: { link: dto.media_url } };
    }
    if (type === "document" && dto.media_url) {
      return {
        type: "document",
        document: {
          link: dto.media_url,
          filename: dto.filename,
          caption: content || undefined,
        },
      };
    }
    if (type === "location" && dto.latitude != null && dto.longitude != null) {
      return {
        type: "location",
        location: {
          latitude: String(dto.latitude),
          longitude: String(dto.longitude),
          name: dto.name,
          address: dto.address,
        },
      };
    }

    return {
      type: "text",
      text: { body: content || "(empty)", preview_url: false },
    };
  }

  private messageDisplayFromDto(dto: SendMessageDto): {
    type: MessageType;
    content: string;
    metadata: Record<string, unknown>;
  } {
    const type = dto.type || "text";
    const content = (dto.content ?? "").trim();
    const metadata: Record<string, unknown> = {};

    const msgType =
      type === "text"
        ? MessageType.TEXT
        : type === "image"
          ? MessageType.IMAGE
          : type === "video"
            ? MessageType.VIDEO
            : type === "audio"
              ? MessageType.AUDIO
              : type === "document"
                ? MessageType.DOCUMENT
                : type === "location"
                  ? MessageType.LOCATION
                  : MessageType.TEXT;

    if (type === "location") {
      const name = dto.name || "Location";
      const addr = dto.address ? ` – ${dto.address}` : "";
      metadata.latitude = dto.latitude;
      metadata.longitude = dto.longitude;
      return { type: msgType, content: `${name}${addr}`, metadata };
    }
    if (
      type === "image" ||
      type === "video" ||
      type === "audio" ||
      type === "document"
    ) {
      if (dto.media_url) metadata.media_url = dto.media_url;
      if (dto.filename) metadata.filename = dto.filename;
      return { type: msgType, content: content || `[${type}]`, metadata };
    }

    return { type: msgType, content, metadata };
  }

  /**
   * Accept/claim an unassigned chat
   */
  @Post(":sessionId/accept")
  async acceptSession(
    @Request() req: { user: { id: string; tenantId: string } },
    @Param("sessionId") sessionId: string,
    @Req() expressReq: RequestLike,
  ) {
    const session = await this.inboxService.assignSession(
      sessionId,
      req.user.id,
    );
    await this.auditService.log({
      tenantId: req.user.tenantId,
      actorId: req.user.id,
      actorType: "user",
      action: AuditActions.CHAT_SESSION_ASSIGNED,
      resourceType: "session",
      resourceId: sessionId,
      details: { agentId: req.user.id },
      requestContext: getRequestContext(expressReq),
    });
    return session;
  }

  /**
   * Resolve a session
   */
  @Put(":sessionId/resolve")
  async resolveSession(
    @Request() req: { user: { id: string; tenantId: string } },
    @Param("sessionId") sessionId: string,
    @Req() expressReq: RequestLike,
    @Body() dto: ResolveSessionDto,
  ) {
    const session = await this.inboxService.resolveSession(
      sessionId,
      req.user.id,
      {
        category: dto.category,
        notes: dto.notes,
        outcome: dto.outcome,
        wrapUpData: dto.wrapUpData,
      },
    );
    await this.auditService.log({
      tenantId: req.user.tenantId,
      actorId: req.user.id,
      actorType: "user",
      action: AuditActions.CHAT_SESSION_RESOLVED,
      resourceType: "session",
      resourceId: sessionId,
      details: { agentId: req.user.id },
      requestContext: getRequestContext(expressReq),
    });
    return session;
  }

  /**
   * Transfer a session to another agent
   */
  @Post(":sessionId/transfer")
  async transferSession(
    @Request() req: { user: { id: string; tenantId: string } },
    @Param("sessionId") sessionId: string,
    @Req() expressReq: RequestLike,
    @Body() dto: TransferSessionDto,
  ) {
    const session = await this.inboxService.transferSession(
      sessionId,
      req.user.id,
      dto.targetAgentId,
      dto.reason,
    );
    await this.auditService.log({
      tenantId: req.user.tenantId,
      actorId: req.user.id,
      actorType: "user",
      action: AuditActions.CHAT_SESSION_TRANSFERRED,
      resourceType: "session",
      resourceId: sessionId,
      details: {
        fromAgentId: req.user.id,
        toAgentId: dto.targetAgentId,
        reason: dto.reason,
      },
      requestContext: getRequestContext(expressReq),
    });
    return session;
  }

  /**
   * Get available agents for transferring a session
   */
  @Get("transfer/agents")
  async getAvailableAgents(
    @Request() req: { user: { id: string; tenantId: string } },
  ) {
    return this.inboxService.getAvailableAgentsForTransfer(
      req.user.tenantId,
      req.user.id,
    );
  }
}
