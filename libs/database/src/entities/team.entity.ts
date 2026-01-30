import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from "typeorm";
import { TeamMemberEntity } from "./team-member.entity";

@Entity("teams")
export class TeamEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ length: 100 })
  name: string;

  @Column({ type: "text", nullable: true })
  description: string;

  @Column({ default: "round_robin" })
  routingStrategy: string;

  /**
   * Team Schedule Configuration
   * Stores: timezone, working days, shifts, OOO message.
   */
  @Column("jsonb", { nullable: true })
  schedule: {
    timezone: string;
    enabled: boolean;
    outOfOfficeMessage?: string;
    days: Record<string, Array<{ start: string; end: string }>>;
  } | null;

  @Column("jsonb", { nullable: true })
  routingConfig: {
    priority: string[]; // e.g. ['active_chats', 'total_assignments']
  } | null;

  /** Whether this team is active (false = disabled) */
  @Column({ default: true })
  isActive: boolean;

  /** Whether this is the default team for the tenant (cannot be deleted) */
  @Column({ default: false })
  isDefault: boolean;

  @OneToMany(() => TeamMemberEntity, (member) => member.team)
  members: TeamMemberEntity[];

  @Column({ length: 50 })
  tenantId: string;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt: Date;
}
