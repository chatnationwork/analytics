
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { InboxSessionEntity } from './inbox-session.entity';

export enum MessageDirection {
  INBOUND = 'inbound',
  OUTBOUND = 'outbound',
}

export enum MessageType {
  TEXT = 'text',
  IMAGE = 'image',
  VIDEO = 'video',
  AUDIO = 'audio',
  DOCUMENT = 'document',
}

@Entity('messages')
@Index(['sessionId', 'createdAt'])
export class MessageEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  sessionId: string;

  @ManyToOne(() => InboxSessionEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sessionId' })
  session: InboxSessionEntity;

  @Column({ length: 50 })
  tenantId: string;

  /** External ID from provider (e.g., wamid) */
  @Column({ nullable: true })
  externalId: string;

  @Column({
    type: 'enum',
    enum: MessageDirection,
  })
  direction: MessageDirection;

  @Column({
    type: 'enum',
    enum: MessageType,
    default: MessageType.TEXT,
  })
  type: MessageType;

  @Column('text', { nullable: true })
  content: string;

  @Column('jsonb', { nullable: true })
  metadata: Record<string, any>; // For media URLs, captions, etc.

  @Column('uuid', { nullable: true })
  senderId: string; // If outbound, the agent's User ID

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
