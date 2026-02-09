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
import { SystemMessagesService } from "../system-messages/system-messages.service";
import { MessageDirection, SessionStatus } from "@lib/database";

interface HandoverDto {
  contactId: string;
  name?: string;
  context?: Record<string, unknown>;
  teamId?: string;
  tenantId?: string;
  sendHandoverMessage?: boolean;
  handoverMessage?: string;
  issue?: string;
  /** Phone number of the WhatsApp Business account (WABA) to use for sending. Picks which CRM integration/creds to use when tenant has multiple. */
  account?: string;
}

@Controller("agent/integration")
@UseGuards(HandoverAuthGuard)
export class IntegrationController {
  constructor(
    private readonly inboxService: InboxService,
    private readonly assignmentService: AssignmentService,
    private readonly whatsappService: WhatsappService,
    private readonly systemMessages: SystemMessagesService,
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
      ...(dto.account ? { account: dto.account } : {}),
    };

    const session = await this.inboxService.getOrCreateSession(
      tenantId,
      dto.contactId,
      dto.name,
      "whatsapp", // Default channel
      context,
    );

    // Decide whether to send the message based on this session's state before assignment.
    // Send when we are assigning a session that was not already assigned (first connect
    // or new conversation). Avoids missing the message when hadActiveSession was wrong
    // (e.g. contactId normalization or race) and ensures name from dto is applied.
    const wasAlreadyAssigned = session.status === SessionStatus.ASSIGNED;

    // Run assignment first so WhatsApp/confirmation message failures never block or prevent assignment
    const result = await this.assignmentService.requestAssignment(
      session.id,
      dto.teamId,
      context,
    );

    const shouldSendMessage =
      dto.sendHandoverMessage !== false && !wasAlreadyAssigned;
    if (shouldSendMessage) {
      const messageContent =
        dto.handoverMessage ??
        (await this.systemMessages.get(tenantId, "handoverMessage"));
      const sessionId = session.id;
      const contactId = session.contactId;
      Promise.all([
        this.whatsappService.sendMessage(tenantId, contactId, messageContent, {
          account: dto.account,
        }),
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
