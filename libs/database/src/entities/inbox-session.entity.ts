
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { UserEntity } from './user.entity';
import { AgentProfileEntity } from './agent-profile.entity';
import { TeamEntity } from './team.entity';

export enum SessionStatus {
  UNASSIGNED = 'unassigned',
  ASSIGNED = 'assigned',
  RESOLVED = 'resolved',
}

@Entity('inbox_sessions')
@Index(['tenantId', 'status'])
@Index(['assignedAgentId'])
export class InboxSessionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 50 })
  tenantId: string;

  /** The end-user's phone number or external ID */
  @Column({ length: 100 })
  contactId: string;

  @Column({ length: 100, nullable: true })
  contactName: string;

  @Column({
    type: 'enum',
    enum: SessionStatus,
    default: SessionStatus.UNASSIGNED,
  })
  status: SessionStatus;

  /** The channel (e.g., 'whatsapp') */
  @Column({ default: 'whatsapp' })
  channel: string;

  @Column('uuid', { nullable: true })
  assignedAgentId: string;

  @ManyToOne(() => UserEntity) 
  @JoinColumn({ name: 'assignedAgentId' })
  assignedAgent: UserEntity;

  @Column('uuid', { nullable: true })
  assignedTeamId: string;

  @ManyToOne(() => TeamEntity)
  @JoinColumn({ name: 'assignedTeamId' })
  assignedTeam: TeamEntity;

  @Column({ type: 'int', default: 0 })
  priority: number; // Higher is more urgent

  @Column({ type: 'jsonb', nullable: true })
  context: Record<string, any>; // e.g. intent, bot handoff data

  @Column({ type: 'timestamptz', nullable: true })
  lastMessageAt: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
