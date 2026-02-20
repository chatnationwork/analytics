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
import { EosEvent } from "./eos-event.entity";
import { EosPollOption } from "./eos-poll-option.entity";

@Entity("eos_polls")
export class EosPoll {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "event_id" })
  eventId: string;

  @ManyToOne(() => EosEvent, { onDelete: "CASCADE" })
  @JoinColumn({ name: "event_id" })
  event: Relation<EosEvent>;

  @Column({ name: "owner_id" })
  ownerId: string;

  @Column({
    name: "owner_type",
    type: "varchar",
    length: 20,
    default: "event",
  })
  ownerType: "event" | "exhibitor" | "speaker";

  @Column({ type: "text" })
  question: string;

  @Column({ name: "is_active", default: true })
  isActive: boolean;

  @OneToMany(() => EosPollOption, (option: EosPollOption) => option.poll, {
    cascade: true,
  })
  options: Relation<EosPollOption>[];

  @Column({ type: "jsonb", default: "{}" })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt: Date;
}
