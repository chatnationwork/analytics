import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Relation,
} from "typeorm";
import { EosPoll } from "./eos-poll.entity";
import { EosPollResponse } from "./eos-poll-response.entity";

@Entity("eos_poll_options")
export class EosPollOption {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "poll_id" })
  pollId: string;

  @ManyToOne(() => EosPoll, (poll: EosPoll) => poll.options, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "poll_id" })
  poll: Relation<EosPoll>;

  @Column({ type: "text" })
  text: string;

  @Column({ default: 0 })
  order: number;

  @OneToMany(
    () => EosPollResponse,
    (response: EosPollResponse) => response.option,
  )
  responses: Relation<EosPollResponse>[];
}
