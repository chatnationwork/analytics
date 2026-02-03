import { Controller, Post, Body, Request, UseGuards } from "@nestjs/common";
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
    // Allow overriding tenantId if provided (e.g. for super-token bots), otherwise fallback to auth context
    const tenantId = dto.tenantId || req.user.tenantId;

    // Merge issue into context if provided
    const context = {
      ...dto.context,
      ...(dto.issue ? { issue: dto.issue } : {}),
    };

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

    // Send confirmation message in background (best-effort; do not block or fail handover)
    const shouldSendMessage = dto.sendHandoverMessage !== false;
    if (shouldSendMessage) {
      const messageContent =
        dto.handoverMessage || "Connecting you to an agent...";
      const sessionId = session.id;
      Promise.all([
        this.whatsappService.sendMessage(
          tenantId,
          dto.contactId,
          messageContent,
        ),
        this.inboxService.addMessage({
          tenantId,
          sessionId,
          contactId: dto.contactId,
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
