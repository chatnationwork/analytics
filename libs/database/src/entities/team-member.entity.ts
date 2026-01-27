
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { UserEntity } from './user.entity';
import { TeamEntity } from './team.entity';

export enum TeamRole {
  MANAGER = 'manager',
  AGENT = 'agent',
  // Deprecated/Legacy
  MEMBER = 'member', 
  LEADER = 'leader',
  ADMIN = 'admin',
  SUB_ADMIN = 'sub_admin',
  VIEWER = 'viewer',
}

@Entity('team_members')
@Index(['teamId', 'userId'], { unique: true })
export class TeamMemberEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  teamId: string;

  @ManyToOne(() => TeamEntity, (team) => team.members, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'teamId' })
  team: TeamEntity;

  @Column('uuid')
  userId: string;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'userId' })
  user: UserEntity;

  @Column({
    type: 'enum',
    enum: TeamRole,
    default: TeamRole.MEMBER,
  })
  role: TeamRole;

  @CreateDateColumn({ type: 'timestamptz' })
  joinedAt: Date;
}
