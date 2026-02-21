import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Relation,
} from "typeorm";
import { EosTicket } from "./eos-ticket.entity";
import { EosLocation } from "./eos-location.entity";

@Entity("eos_scan_logs")
export class EosScanLog {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "ticket_id" })
  ticketId: string;

  @ManyToOne(() => EosTicket, { onDelete: "CASCADE" })
  @JoinColumn({ name: "ticket_id" })
  ticket: Relation<EosTicket>;

  @Column({ name: "location_id", nullable: true })
  locationId: string;

  @ManyToOne(() => EosLocation, { onDelete: "SET NULL" })
  @JoinColumn({ name: "location_id" })
  location: Relation<EosLocation>;

  @Column({ length: 50, default: "success" })
  status: string;

  @CreateDateColumn({ name: "timestamp", type: "timestamptz" })
  timestamp: Date;
}
