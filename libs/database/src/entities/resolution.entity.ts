import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  OneToOne,
  JoinColumn,
} from "typeorm";
import { InboxSessionEntity } from "./inbox-session.entity";

@Entity("resolutions")
export class ResolutionEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column("uuid")
  sessionId: string;

  @OneToOne(() => InboxSessionEntity)
  @JoinColumn({ name: "sessionId" })
  session: InboxSessionEntity;

  @Column({ length: 100 })
  category: string;

  @Column("text", { nullable: true })
  notes: string;

  @Column({ length: 50, default: "resolved" })
  outcome: string;

  @Column("uuid")
  resolvedByAgentId: string;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date;

  // CSAT Score (updated later)
  @Column({ type: "int", nullable: true })
  csatScore: number;

  @Column("text", { nullable: true })
  csatFeedback: string;

  /** Dynamic wrap-up form values (field id -> value) when team uses custom wrap-up fields */
  @Column("jsonb", { nullable: true })
  formData: Record<string, string | number | boolean> | null;
}
