import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Relation,
} from "typeorm";
import { EosPollOption } from "./eos-poll-option.entity";
import { ContactEntity } from "./contact.entity";

@Entity("eos_poll_responses")
export class EosPollResponse {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "poll_option_id" })
  pollOptionId: string;

  @ManyToOne(() => EosPollOption, (option: EosPollOption) => option.responses, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "poll_option_id" })
  option: Relation<EosPollOption>;

  @Column({ name: "contact_id", nullable: true })
  contactId: string;

  @ManyToOne(() => ContactEntity, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "contact_id" })
  contact: Relation<ContactEntity>;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;
}
