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

@Entity("eos_locations")
export class EosLocation {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "event_id" })
  eventId: string;

  @ManyToOne(() => EosEvent, { onDelete: "CASCADE" })
  @JoinColumn({ name: "event_id" })
  event: Relation<EosEvent>;

  @Column({ length: 255 })
  name: string;

  @Column({ nullable: true, type: "text" })
  description: string;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt: Date;
}
