import {
  Controller,
  Post,
  Body,
  Request,
  UseGuards,
  BadRequestException,
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { HandoverAuthGuard } from "../auth/handover-auth.guard";
import { InboxService } from "./inbox.service";

import { AssignmentService } from "./assignment.service";
import { WhatsappService } from "../whatsapp/whatsapp.service";
import { MessageDirection } from "@lib/database";

interface HandoverDto {
  contactId: string;
  name?: string;
  context?: Record<string, unknown>;
  teamId?: string;
  tenantId?: string;
  sendHandoverMessage?: boolean;
  handoverMessage?: string;
  issue?: string;
}

@Controller("agent/integration")
@UseGuards(HandoverAuthGuard)
export class IntegrationController {
  constructor(
    private readonly inboxService: InboxService,
    private readonly assignmentService: AssignmentService,
    private readonly whatsappService: WhatsappService,
  ) {}

  /**
   * Trigger a handover from the bot to the agent system.
   * Creates or updates a session and requests assignment.
   */
  @Post("handover")
  async handover(@Request() req: any, @Body() dto: HandoverDto) {
    if (!dto.contactId || typeof dto.contactId !== "string") {
      throw new BadRequestException("contactId is required");
    }
    const tenantId = dto.tenantId || req.user.tenantId;

    const context = {
      ...dto.context,
      ...(dto.issue ? { issue: dto.issue } : {}),
    };

    // Only send "Connecting you to an agent..." when the user does not already have an active session
    const hadActiveSession = await this.inboxService.hasActiveAgentSession(
      dto.contactId,
      tenantId,
    );

    const session = await this.inboxService.getOrCreateSession(
      tenantId,
      dto.contactId,
      dto.name,
      "whatsapp", // Default channel
      context,
    );

    // Run assignment first so WhatsApp/confirmation message failures never block or prevent assignment
    const result = await this.assignmentService.requestAssignment(
      session.id,
      dto.teamId,
      context,
    );

    // Send confirmation message only when requested and user did not already have an active session
    const shouldSendMessage =
      dto.sendHandoverMessage !== false && !hadActiveSession;
    if (shouldSendMessage) {
      const messageContent =
        dto.handoverMessage || "Connecting you to an agent...";
      const sessionId = session.id;
      const contactId = session.contactId;
      Promise.all([
        this.whatsappService.sendMessage(tenantId, contactId, messageContent),
        this.inboxService.addMessage({
          tenantId,
          sessionId,
          contactId,
          direction: MessageDirection.OUTBOUND,
          content: messageContent,
          senderId: undefined,
        }),
      ]).catch((err) => {
        console.error(
          "Handover confirmation message failed (assignment already done):",
          err?.message || err,
        );
      });
    }

    return result;
  }
}
