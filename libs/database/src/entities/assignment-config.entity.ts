
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('assignment_configs')
export class AssignmentConfigEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 50 })
  tenantId: string;

  @Column({ length: 100, nullable: true })
  teamId: string; // Specific to a team, or global if null

  @Column({ default: true })
  enabled: boolean;

  @Column({ default: 'round_robin' })
  strategy: string; // 'round_robin', 'load_balanced', 'manual'

  @Column({ type: 'jsonb', nullable: true })
  settings: Record<string, any>; // Strategy usage settings

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
