import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  ManyToMany,
  JoinTable,
  JoinColumn,
  Relation,
} from "typeorm";
import { EosEvent } from "@lib/database/entities/eos-event.entity";
import { EosTicket } from "@lib/database/entities/eos-ticket.entity";
import { EosLocation } from "@lib/database/entities/eos-location.entity";

@Entity("eos_ticket_types")
export class EosTicketType {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "event_id" })
  eventId: string;

  @ManyToOne(() => EosEvent, (e: EosEvent) => e.ticketTypes, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "event_id" })
  event: Relation<EosEvent>;

  @Column({ length: 100 })
  name: string;

  @Column({ nullable: true, type: "text" })
  description: string;

  @Column({ type: "decimal", precision: 10, scale: 2, default: 0 })
  price: number;

  @Column({ length: 3, default: "KES" })
  currency: string;

  @Column({ name: "quantity_total", nullable: true, type: "int" })
  quantityTotal: number;

  @Column({ name: "quantity_sold", default: 0 })
  quantitySold: number;

  @Column({ name: "max_per_order", default: 10 })
  maxPerOrder: number;

  @Column({ name: "sales_start_at", nullable: true, type: "timestamptz" })
  salesStartAt: Date;

  @Column({ name: "sales_end_at", nullable: true, type: "timestamptz" })
  salesEndAt: Date;

  @Column({ name: "is_active", default: true })
  isActive: boolean;

  @Column({ name: "sort_order", default: 0 })
  sortOrder: number;

  @OneToMany(() => EosTicket, (t: EosTicket) => t.ticketType)
  tickets: Relation<EosTicket>[];

  @ManyToMany(() => EosLocation)
  @JoinTable({
    name: "eos_ticket_type_locations",
    joinColumn: { name: "ticket_type_id", referencedColumnName: "id" },
    inverseJoinColumn: { name: "location_id", referencedColumnName: "id" },
  })
  accessLocations: Relation<EosLocation>[];

  @Column({ type: "jsonb", nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;
}
