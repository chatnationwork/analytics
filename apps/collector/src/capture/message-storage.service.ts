import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import {
  InboxSessionEntity,
  MessageEntity,
  MessageDirection,
  MessageType,
  ContactRepository,
  InboxSessionHelper,
  normalizeContactIdDigits,
  TeamEntity,
} from "@lib/database";

import { CaptureEventDto } from "@lib/events";
import { Project } from "@lib/common";

@Injectable()
export class MessageStorageService {
  private readonly logger = new Logger(MessageStorageService.name);
  private readonly sessionHelper: InboxSessionHelper;

  constructor(
    @InjectRepository(InboxSessionEntity)
    private readonly sessionRepo: Repository<InboxSessionEntity>,
    @InjectRepository(MessageEntity)
    private readonly messageRepo: Repository<MessageEntity>,
    @InjectRepository(TeamEntity)
    private readonly teamRepo: Repository<TeamEntity>,
    private readonly contactRepo: ContactRepository,
  ) {
    this.sessionHelper = new InboxSessionHelper(this.sessionRepo, this.teamRepo);
  }

  /**
   * Process and store message events.
   * Only handles 'message.received' and 'message.sent'.
   */
  async storeEvent(event: CaptureEventDto, project: Project): Promise<void> {
    if (
      event.event_name !== "message.received" &&
      event.event_name !== "message.sent"
    ) {
      return;
    }

    try {
      const tenantId = project.tenantId;
      const properties = event.properties as Record<string, any>;
      const rawContactId = event.user_id;

      // Skip if no user_id (contactId) provided
      if (!rawContactId) {
        this.logger.warn(
          `Skipping message storage for event ${event.event_name}: No user_id provided`,
        );
        return;
      }

      const contactName = (properties?.name ??
        properties?.profileName ??
        (event.context as any)?.name) as string | undefined;

      this.logger.debug(
        `Storing message event: ${event.event_name} for ${rawContactId}`,
      );

      // 1. Only add to inbox when contact already has a session (created by handover or existing).
      // If no session exists, we still store the message (orphaned) so we don't lose data.
      // But we do NOT create a new session here (to respect handover flow).
      const session = await this.sessionHelper.getExistingSession(
        tenantId,
        rawContactId,
      );

      // Still upsert contact for analytics when we receive a message
      const normalizedContactId = normalizeContactIdDigits(rawContactId);
      if (
        (event.event_name === "message.received" ||
          event.event_name === "message.sent") &&
        normalizedContactId
      ) {
        await this.contactRepo.upsertFromMessageReceived(
          tenantId,
          normalizedContactId,
          new Date(),
          contactName || undefined,
        );
      }

      if (!session) {
        this.logger.debug(
          `No inbox session for ${rawContactId}; storing message as ORPHAN (sessionId=null).`,
        );
      } else {
        // Only update session timestamp if session exists
        const now = new Date();
        const updatePayload: Partial<InboxSessionEntity> = {
          lastMessageAt: now,
        };
        // Update lastInboundMessageAt if it was inbound
        if (event.event_name === "message.received") {
          updatePayload.lastInboundMessageAt = now;
        }
        await this.sessionRepo.update(session.id, updatePayload);
      }

      // 2. Deduplicate: skip if a message with the same externalId already exists
      const extId = properties.messageId as string | undefined;
      if (extId) {
        const existing = await this.messageRepo.findOne({
          where: { tenantId, externalId: extId },
          select: ["id"],
        });
        if (existing) {
          this.logger.debug(
            `Message with externalId ${extId} already exists (${existing.id}); skipping duplicate.`,
          );
          return;
        }
      }

      // 3. Create Message
      const direction =
        event.event_name === "message.received"
          ? MessageDirection.INBOUND
          : MessageDirection.OUTBOUND;

      const messageType = (properties.contentType ||
        properties.type ||
        "text") as MessageType;

      const message = this.messageRepo.create({
        contactId: normalizedContactId || rawContactId, // fallback to raw
        sessionId: session?.id || undefined, // Allow null/undefined for orphan messages
        tenantId,
        externalId: extId,
        direction,
        type: Object.values(MessageType).includes(messageType)
          ? messageType
          : MessageType.TEXT,
        content: properties.text || properties.content || properties.caption, // Adapting to various payload shapes
        metadata: properties,
        senderId:
          direction === MessageDirection.OUTBOUND
            ? properties.agentId
            : undefined,
      });

      await this.messageRepo.save(message);

      this.logger.log(
        `Stored message ${message.id} for contact ${normalizedContactId} (Session: ${session?.id || "None"})`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to store message event: ${error.message}`,
        error.stack,
      );
      // We do not throw, as analytics collection should proceed even if storage fails
    }
  }
}
