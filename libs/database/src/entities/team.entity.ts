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
    outOfOfficeImage?: string;
    days: Record<string, Array<{ start: string; end: string }>>;
  } | null;

  @Column("jsonb", { nullable: true })
  routingConfig: {
    priority?: string[];
    sortBy?: string;
    timeWindow?: string;
    /** Maximum concurrent chats (inbox sessions) per agent; agents at or above this are excluded from assignment. Omitted = no limit. */
    maxLoad?: number;
  } | null;

  /**
   * Wrap-up report config for agents when resolving a chat.
   * When enabled, agents see this team's wrap-up form (configurable fields); mandatory requires filling before resolve.
   */
  @Column("jsonb", { nullable: true })
  wrapUpReport: {
    enabled: boolean;
    mandatory: boolean;
    fields?: Array<{
      id: string;
      type: "select" | "text" | "textarea";
      label: string;
      required: boolean;
      placeholder?: string;
      options?: Array<{ value: string; label: string }>;
    }>;
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
