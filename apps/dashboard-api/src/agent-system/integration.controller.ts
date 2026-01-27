import { Controller, Post, Body, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { HandoverAuthGuard } from '../auth/handover-auth.guard';
import { InboxService } from './inbox.service';

import { AssignmentService } from './assignment.service';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import { MessageDirection } from '@lib/database';

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

@Controller('agent/integration')
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
  @Post('handover')
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
      'whatsapp', // Default channel
      context,
    );

    // Send confirmation message if requested (default to true if not specified)
    const shouldSendMessage = dto.sendHandoverMessage !== false;

    if (shouldSendMessage) {
      const messageContent = dto.handoverMessage || 'Connecting you to an agent...';
      
      // Async send (fire and forget to not block api latency)
      this.whatsappService.sendMessage(dto.contactId, messageContent)
        .catch(err => console.error('Failed to send handover message:', err));

      await this.inboxService.addMessage({
        tenantId,
        sessionId: session.id,
        contactId: dto.contactId,
        direction: MessageDirection.OUTBOUND,
        content: messageContent,
        senderId: undefined, // System message (or potentially the bot user if we had one)
      });
    }

    return this.assignmentService.requestAssignment(
      session.id,
      dto.teamId,
      context,
    );
  }
}
