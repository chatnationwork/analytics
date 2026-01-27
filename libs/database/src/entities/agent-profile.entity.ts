
import {
  Entity,
  Column,
  PrimaryColumn,
  OneToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserEntity } from './user.entity';

export enum AgentStatus {
  ONLINE = 'online',
  OFFLINE = 'offline',
  BUSY = 'busy',
}

@Entity('agent_profiles')
export class AgentProfileEntity {
  @PrimaryColumn('uuid')
  userId: string;

  @OneToOne(() => UserEntity)
  @JoinColumn({ name: 'userId' })
  user: UserEntity;

  @Column({
    type: 'enum',
    enum: AgentStatus,
    default: AgentStatus.OFFLINE,
  })
  status: AgentStatus;

  @Column({ default: 3 })
  maxConcurrentChats: number;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
