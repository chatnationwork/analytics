import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, In } from "typeorm";
import {
  InboxSessionEntity,
  MessageEntity,
  SessionStatus,
  MessageDirection,
  MessageType,
  ContactRepository,
  toCanonicalContactId,
} from "@lib/database";
import { CaptureEventDto } from "@lib/events";
import { Project } from "@lib/common";

@Injectable()
export class MessageStorageService {
  private readonly logger = new Logger(MessageStorageService.name);

  constructor(
    @InjectRepository(InboxSessionEntity)
    private readonly sessionRepo: Repository<InboxSessionEntity>,
    @InjectRepository(MessageEntity)
    private readonly messageRepo: Repository<MessageEntity>,
    private readonly contactRepo: ContactRepository,
  ) {}

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
      const contactId = toCanonicalContactId(event.user_id); // Phone number, normalized to avoid duplicate contacts
      const properties = event.properties as Record<string, any>;

      this.logger.debug(
        `Storing message event: ${event.event_name} for ${contactId}`,
      );

      // 1. Get or Create Session – reuse existing pending session so we never open a new chat while one is open
      let session = await this.sessionRepo.findOne({
        where: {
          tenantId,
          contactId,
          status: In([SessionStatus.ASSIGNED, SessionStatus.UNASSIGNED]),
        },
        order: { lastMessageAt: "DESC" },
      });

      if (!session) {
        session = this.sessionRepo.create({
          tenantId,
          contactId,
          status: SessionStatus.UNASSIGNED,
          channel: (event.context as any)?.channel || "whatsapp",
          lastMessageAt: new Date(),
        });
        session = await this.sessionRepo.save(session);
      } else {
        // Update timestamp
        await this.sessionRepo.update(session.id, {
          lastMessageAt: new Date(),
        });
      }

      // Upsert contact when we receive a message (creates or updates contacts table)
      if (event.event_name === "message.received" && contactId) {
        const name = (properties?.name ??
          properties?.profileName ??
          (event.context as any)?.name) as string | undefined;
        await this.contactRepo.upsertFromMessageReceived(
          tenantId,
          contactId,
          new Date(),
          name || undefined,
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
