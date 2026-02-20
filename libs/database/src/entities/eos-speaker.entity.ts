import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Relation,
} from "typeorm";
import { EosEvent } from "./eos-event.entity";
import { ContactEntity } from "./contact.entity";

@Entity("eos_speakers")
export class EosSpeaker {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "event_id" })
  eventId: string;

  @ManyToOne(() => EosEvent, { onDelete: "CASCADE" })
  @JoinColumn({ name: "event_id" })
  event: Relation<EosEvent>;

  @Column({ name: "organization_id", nullable: true })
  organizationId: string;

  @Column({ length: 255 })
  name: string;

  @Column({ nullable: true, type: "text" })
  bio: string;

  @Column({ name: "headshot_url", nullable: true, type: "text" })
  headshotUrl: string;

  @Column({ name: "presentation_url", nullable: true, type: "text" })
  presentationUrl: string;

  @Column({ name: "talk_title", nullable: true, length: 255 })
  talkTitle: string;

  @Column({ name: "session_time", nullable: true, type: "timestamptz" })
  sessionTime: Date;

  @Column({ name: "contact_id", nullable: true })
  contactId: string;

  @ManyToOne(() => ContactEntity, { nullable: true })
  @JoinColumn({ name: "contact_id" })
  contact: Relation<ContactEntity>;

  @Column({
    name: "invitation_token",
    nullable: true,
    unique: true,
    length: 255,
  })
  invitationToken: string;

  @Column({ name: "invited_at", nullable: true, type: "timestamptz" })
  invitedAt: Date;

  @Column({ length: 20, default: "pending" })
  status: "invited" | "pending" | "approved" | "rejected";

  @Column({ type: "jsonb", default: "{}" })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt: Date;
}
