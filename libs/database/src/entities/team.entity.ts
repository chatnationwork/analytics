
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { TeamMemberEntity } from './team-member.entity';

@Entity('teams')
export class TeamEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ default: 'round_robin' })
  routingStrategy: string;

  @OneToMany(() => TeamMemberEntity, (member) => member.team)
  members: TeamMemberEntity[];

  @Column({ length: 50 })
  tenantId: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
