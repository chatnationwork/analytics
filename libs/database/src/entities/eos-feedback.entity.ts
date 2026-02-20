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

@Entity("eos_feedback")
export class EosFeedback {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "event_id" })
  eventId: string;

  @ManyToOne(() => EosEvent, { onDelete: "CASCADE" })
  @JoinColumn({ name: "event_id" })
  event: Relation<EosEvent>;

  @Column({ name: "target_id" })
  targetId: string;

  @Column({
    name: "target_type",
    type: "varchar",
    length: 20,
    default: "event",
  })
  targetType: "event" | "exhibitor" | "speaker";

  @Column({ name: "contact_id", nullable: true })
  contactId: string;

  @ManyToOne(() => ContactEntity, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "contact_id" })
  contact: Relation<ContactEntity>;

  @Column({ type: "int", default: 5 })
  rating: number;

  @Column({ type: "text", nullable: true })
  comment: string;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt: Date;
}
