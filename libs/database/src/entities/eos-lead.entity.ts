import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Relation,
} from "typeorm";
import { EosExhibitor } from "@lib/database/entities/eos-exhibitor.entity";
import { ContactEntity } from "@lib/database/entities/contact.entity";

@Entity("eos_leads")
export class EosLead {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "exhibitor_id" })
  exhibitorId: string;

  @ManyToOne(() => EosExhibitor, (e: EosExhibitor) => e.leads, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "exhibitor_id" })
  exhibitor: Relation<EosExhibitor>;

  @Column({ name: "contact_id" })
  contactId: string;

  @ManyToOne(() => ContactEntity)
  @JoinColumn({ name: "contact_id" })
  contact: Relation<ContactEntity>;

  @Column({ nullable: true, length: 50 })
  source: "qr_scan" | "chat" | "booth_visit";

  @Column({ nullable: true, type: "text" })
  notes: string;

  /** AI-classified interest level */
  @Column({ name: "interest_level", length: 20, nullable: true })
  interestLevel: "cold" | "warm" | "hot";

  /** Extracted AI intent summary e.g. "Wants 50 units of product X" */
  @Column({ name: "ai_intent", nullable: true, type: "text" })
  aiIntent: string;

  /** Lifecycle context at time of capture */
  @Column({ name: "interaction_context", length: 20, default: "event_active" })
  interactionContext: "event_active" | "grace_period" | "independent";

  @Column({ name: "follow_up_status", length: 20, default: "new" })
  followUpStatus: string;

  @Column({ name: "followed_up_at", nullable: true, type: "timestamptz" })
  followedUpAt: Date;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;
}
