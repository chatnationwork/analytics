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
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { InboxService, InboxFilter } from "./inbox.service";
import { AssignmentService } from "./assignment.service";

import { WhatsappService } from "../whatsapp/whatsapp.service";
import { MessageDirection } from "@lib/database";

/**
 * DTO for sending a message as an agent
 */
interface SendMessageDto {
  content: string;
  type?: "text" | "image" | "video" | "audio" | "document";
  metadata?: Record<string, unknown>;
}

/**
 * DTO for resolving a session
 */
interface ResolveSessionDto {
  category: string;
  notes?: string;
  outcome?: string;
}

/**
 * DTO for transferring a session to another agent
 */
interface TransferSessionDto {
  targetAgentId: string;
  reason?: string;
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
    private readonly whatsappService: WhatsappService,
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
    @Request() req: { user: { id: string; tenantId: string } },
    @Query("filter") filter?: InboxFilter,
  ) {
    return this.inboxService.getAgentInbox(
      req.user.tenantId,
      req.user.id,
      filter,
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
   * Get a specific session with its messages
   */
  @Get(":sessionId")
  async getSession(@Param("sessionId") sessionId: string) {
    const session = await this.inboxService.getSession(sessionId);
    const messages = await this.inboxService.getSessionMessages(sessionId);

    return {
      session,
      messages,
    };
  }

  /**
   * Send a message in a session
   */
  @Post(":sessionId/message")
  async sendMessage(
    @Request() req: { user: { id: string; tenantId: string } },
    @Param("sessionId") sessionId: string,
    @Body() dto: SendMessageDto,
  ) {
    const session = await this.inboxService.getSession(sessionId);

    // Send via WhatsApp
    // Note: We only support TEXT messages for now via this internal API
    if (dto.type === "text" || !dto.type) {
      await this.whatsappService.sendMessage(req.user.tenantId, session.contactId, dto.content);
    }

    return this.inboxService.addMessage({
      sessionId,
      tenantId: req.user.tenantId,
      contactId: session.contactId,
      direction: MessageDirection.OUTBOUND,
      content: dto.content,
      metadata: dto.metadata,
      senderId: req.user.id,
    });
  }

  /**
   * Accept/claim an unassigned chat
   */
  @Post(":sessionId/accept")
  async acceptSession(
    @Request() req: { user: { id: string } },
    @Param("sessionId") sessionId: string,
  ) {
    return this.inboxService.assignSession(sessionId, req.user.id);
  }

  /**
   * Resolve a session
   */
  @Put(":sessionId/resolve")
  async resolveSession(
    @Request() req: { user: { id: string } },
    @Param("sessionId") sessionId: string,
    @Body() dto: ResolveSessionDto,
  ) {
    return this.inboxService.resolveSession(sessionId, req.user.id, {
      category: dto.category,
      notes: dto.notes,
      outcome: dto.outcome,
    });
  }

  /**
   * Transfer a session to another agent
   */
  @Post(":sessionId/transfer")
  async transferSession(
    @Request() req: { user: { id: string } },
    @Param("sessionId") sessionId: string,
    @Body() dto: TransferSessionDto,
  ) {
    return this.inboxService.transferSession(
      sessionId,
      req.user.id,
      dto.targetAgentId,
      dto.reason,
    );
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
