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

      // 1. Get or Create Session via shared helper (handles normalization + dedup)
      let session: InboxSessionEntity;
      try {
        session = await this.sessionHelper.getOrCreateSession(
          tenantId,
          rawContactId,
          {
            contactName,
            channel: (event.context as any)?.channel || "whatsapp",
          },
        );
      } catch (err) {
        this.logger.warn(
          `Skipping message storage: ${(err as Error).message}`,
        );
        return;
      }

      // Update lastMessageAt
      await this.sessionRepo.update(session.id, { lastMessageAt: new Date() });

      // Upsert contact when we receive a message (creates or updates contacts table)
      const normalizedContactId = normalizeContactIdDigits(rawContactId);
      if (event.event_name === "message.received" && normalizedContactId) {
        await this.contactRepo.upsertFromMessageReceived(
          tenantId,
          normalizedContactId,
          new Date(),
          contactName || undefined,
        );

      }

      // 2. Create Message
      const direction =
        event.event_name === "message.received"
          ? MessageDirection.INBOUND
          : MessageDirection.OUTBOUND;

      const messageType = (properties.contentType ||
        properties.type ||
        "text") as MessageType;

      const message = this.messageRepo.create({
        contactId: session.contactId,
        sessionId: session.id,
        tenantId,
        externalId: properties.messageId as string,
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

      this.logger.log(`Stored message ${message.id} for session ${session.id}`);
    } catch (error) {
      this.logger.error(
        `Failed to store message event: ${error.message}`,
        error.stack,
      );
      // We do not throw, as analytics collection should proceed even if storage fails
    }
  }
}
