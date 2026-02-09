import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { UserEntity } from "./user.entity";
import { AgentProfileEntity } from "./agent-profile.entity";
import { TeamEntity } from "./team.entity";

export enum SessionStatus {
  UNASSIGNED = "unassigned",
  ASSIGNED = "assigned",
  RESOLVED = "resolved",
}

@Entity("inbox_sessions")
@Index(["tenantId", "status"])
@Index(["assignedAgentId"])
export class InboxSessionEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ length: 50 })
  tenantId: string;

  /** The end-user's phone number or external ID */
  @Column({ length: 100 })
  contactId: string;

  @Column({ length: 100, nullable: true })
  contactName: string;

  @Column({
    type: "enum",
    enum: SessionStatus,
    default: SessionStatus.UNASSIGNED,
  })
  status: SessionStatus;

  /** The channel (e.g., 'whatsapp') */
  @Column({ default: "whatsapp" })
  channel: string;

  @Column("uuid", { nullable: true })
  assignedAgentId: string;

  /** When this session was assigned to the current agent (for agent session metrics) */
  @Column({ type: "timestamptz", nullable: true })
  assignedAt: Date;

  /**
   * When the current agent explicitly accepted the chat.
   * - Engine/auto-assignment sets assignedAt but leaves acceptedAt null.
   * - /agent/inbox/:id/accept sets/updates acceptedAt for the current owner.
   */
  @Column({ type: "timestamptz", nullable: true })
  acceptedAt: Date | null;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: "assignedAgentId" })
  assignedAgent: UserEntity;

  @Column("uuid", { nullable: true })
  assignedTeamId: string;

  @ManyToOne(() => TeamEntity)
  @JoinColumn({ name: "assignedTeamId" })
  assignedTeam: TeamEntity;

  @Column({ type: "int", default: 0 })
  priority: number; // Higher is more urgent

  @Column({ type: "jsonb", nullable: true })
  context: Record<string, any>; // e.g. intent, bot handoff data

  @Column({ type: "timestamptz", nullable: true })
  lastMessageAt: Date;

  /**
   * When the assigned agent last viewed this chat or sent a message.
   * Used with lastInboundMessageAt to show unread indicator (replies by user).
   */
  @Column({ type: "timestamptz", nullable: true })
  lastReadAt: Date | null;

  /**
   * When the customer last sent an inbound message. Updated on each inbound message.
   * Unread when lastInboundMessageAt > lastReadAt (or lastReadAt is null).
   */
  @Column({ type: "timestamptz", nullable: true })
  lastInboundMessageAt: Date | null;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt: Date;
}
