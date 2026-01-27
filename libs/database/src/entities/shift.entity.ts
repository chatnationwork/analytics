
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { UserEntity } from './user.entity';
import { TeamEntity } from './team.entity';

@Entity('shifts')
@Index(['teamId', 'startTime', 'endTime'])
export class ShiftEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid', { nullable: true })
  teamId: string;

  @ManyToOne(() => TeamEntity)
  @JoinColumn({ name: 'teamId' })
  team: TeamEntity;

  @Column('uuid')
  userId: string;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'userId' })
  user: UserEntity;

  /** Start time of the shift */
  @Column({ type: 'timestamptz' })
  startTime: Date;

  /** End time of the shift */
  @Column({ type: 'timestamptz' })
  endTime: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
