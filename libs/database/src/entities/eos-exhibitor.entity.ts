import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Relation,
} from "typeorm";
import { EosEvent } from "@lib/database/entities/eos-event.entity";
import { EosLead } from "@lib/database/entities/eos-lead.entity";
import { ContactEntity } from "@lib/database/entities/contact.entity";
// import { Organization } from './organization.entity'; // Using implicit ID if Org entity not readily available or to avoid circular deps, referencing by ID usually safer in modular setup

@Entity("eos_exhibitors")
export class EosExhibitor {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "event_id" })
  eventId: string;

  @ManyToOne(() => EosEvent, (e: EosEvent) => e.exhibitors, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "event_id" })
  event: Relation<EosEvent>;

  @Column({ name: "organization_id", nullable: true })
  organizationId: string;

  // @ManyToOne(() => Organization, { nullable: true })
  // @JoinColumn({ name: 'organization_id' })
  // organization: Organization;

  @Column({ length: 255 })
  name: string;

  @Column({ nullable: true, type: "text" })
  description: string;

  @Column({ name: "logo_url", nullable: true, type: "text" })
  logoUrl: string;

  @Column({ name: "booth_number", nullable: true, length: 50 })
  boothNumber: string;

  /** { x: number, y: number, width: number, height: number } */
  @Column({ name: "booth_location", nullable: true, type: "jsonb" })
  boothLocation: { x: number; y: number; width: number; height: number };

  @Column({ name: "contact_name", nullable: true, length: 255 })
  contactName: string;

  @Column({ name: "contact_email", nullable: true, length: 255 })
  contactEmail: string;

  @Column({ name: "contact_phone", nullable: true, length: 20 })
  contactPhone: string;

  @Column({ name: "contact_id", nullable: true })
  contactId: string;

  @ManyToOne(() => ContactEntity, { nullable: true })
  @JoinColumn({ name: "contact_id" })
  contact: Relation<ContactEntity>;

  @Column({ type: "jsonb", default: "{}" })
  settings: Record<string, any>;

  @Column({
    name: "invitation_token",
    nullable: true,
    unique: true,
    length: 255,
  })
  invitationToken: string;

  @Column({ name: "invited_at", nullable: true, type: "timestamptz" })
  invitedAt: Date;

  @Column({
    name: "booth_token",
    nullable: true,
    unique: true,
    length: 255,
  })
  boothToken: string;

  @Column({ length: 20, default: "pending" })
  status: "invited" | "pending" | "approved" | "rejected";

  @OneToMany(() => EosLead, (l: EosLead) => l.exhibitor)
  leads: Relation<EosLead>[];

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt: Date;
}
