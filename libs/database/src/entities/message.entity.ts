import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from "typeorm";
import { InboxSessionEntity } from "./inbox-session.entity";

/**
 * Enum for message direction.
 * INBOUND = message from user to system
 * OUTBOUND = message from system/agent to user
 */
export enum MessageDirection {
  INBOUND = "inbound",
  OUTBOUND = "outbound",
}

/**
 * Enum for message content types.
 */
export enum MessageType {
  TEXT = "text",
  IMAGE = "image",
  VIDEO = "video",
  AUDIO = "audio",
  DOCUMENT = "document",
  LOCATION = "location",
  CONTACTS = "contacts",
  TEMPLATE = "template",
  INTERACTIVE = "interactive",
}

/**
 * Message entity representing a single message in a conversation.
 * Messages are tied to a contact (permanent) and optionally to a session (temporary view).
 * Deleting a session does NOT delete messages - they remain tied to the contact.
 */
@Entity("messages")
@Index(["contactId", "createdAt"])
@Index(["sessionId", "createdAt"])
export class MessageEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  /**
   * Contact ID (normalized phone number, digits only).
   * This is the primary relationship - messages belong to the contact.
   */
  @Column({ length: 50, nullable: true })
  contactId: string;

  /**
   * Session ID (optional).
   * Links to the inbox session when the message was created.
   * SET NULL on session delete - messages persist.
   */
  @Column("uuid", { nullable: true })
  sessionId: string | null;

  @ManyToOne(() => InboxSessionEntity, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "sessionId" })
  session: InboxSessionEntity | null;

  @Column({ length: 50 })
  tenantId: string;

  /** External ID from provider (e.g., wamid) */
  @Column({ nullable: true })
  externalId: string;

  @Column({
    type: "enum",
    enum: MessageDirection,
  })
  direction: MessageDirection;

  @Column({
    type: "enum",
    enum: MessageType,
    default: MessageType.TEXT,
  })
  type: MessageType;

  @Column("text", { nullable: true })
  content: string;

  @Column("jsonb", { nullable: true })
  metadata: Record<string, unknown>; // For media URLs, captions, etc.

  @Column("uuid", { nullable: true })
  senderId: string; // If outbound, the agent's User ID

  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date;
}
