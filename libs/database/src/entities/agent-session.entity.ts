/**
 * Agent session – represents when an agent was "online" (presence).
 * Used for agent status viewership: who is online/offline, session duration,
 * chats received/resolved per session, etc.
 */

import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { UserEntity } from "./user.entity";

@Entity("agent_sessions")
@Index(["tenantId", "agentId"])
@Index(["tenantId", "startedAt"])
export class AgentSessionEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ length: 50 })
  tenantId: string;

  @Column("uuid")
  agentId: string;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: "agentId" })
  agent: UserEntity;

  /** When the agent went online */
  @Column({ type: "timestamptz" })
  startedAt: Date;

  /** When the agent went offline; null = still online */
  @Column({ type: "timestamptz", nullable: true })
  endedAt: Date | null;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date;
}
