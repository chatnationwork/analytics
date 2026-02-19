import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Relation,
} from "typeorm";
import { EosTicketType } from "@lib/database/entities/eos-ticket-type.entity";
import { ContactEntity } from "@lib/database/entities/contact.entity";
import { GeneratedCard } from "@lib/database/entities/generated-card.entity";

@Entity("eos_tickets")
export class EosTicket {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "ticket_type_id" })
  ticketTypeId: string;

  @ManyToOne(() => EosTicketType, (tt: EosTicketType) => tt.tickets)
  @JoinColumn({ name: "ticket_type_id" })
  ticketType: Relation<EosTicketType>;

  @Column({ name: "contact_id" })
  contactId: string;

  @ManyToOne(() => ContactEntity)
  @JoinColumn({ name: "contact_id" })
  contact: Relation<ContactEntity>;

  @Column({ name: "ticket_code", length: 20, unique: true })
  ticketCode: string;

  @Column({ name: "qr_code_url", nullable: true, type: "text" })
  qrCodeUrl: string;

  @Column({ name: "holder_name", nullable: true, length: 255 })
  holderName: string;

  @Column({ name: "holder_email", nullable: true, length: 255 })
  holderEmail: string;

  @Column({ name: "holder_phone", nullable: true, length: 20 })
  holderPhone: string;

  @Column({
    name: "amount_paid",
    nullable: true,
    type: "decimal",
    precision: 10,
    scale: 2,
  })
  amountPaid: number;

  @Column({ name: "payment_reference", nullable: true, length: 100 })
  paymentReference: string;

  @Column({ name: "payment_status", length: 20, default: "pending" })
  paymentStatus: "pending" | "completed" | "failed";

  /** { mpesa_receipt: string, checkout_request_id: string } */
  @Column({ name: "payment_metadata", nullable: true, type: "jsonb" })
  paymentMetadata: { mpesa_receipt?: string; checkout_request_id?: string };

  @Column({ name: "hype_card_id", nullable: true })
  hypeCardId: string;

  // Assuming GeneratedCard entity exists or we leave it loose for now if not imported
  @ManyToOne(() => GeneratedCard, { nullable: true })
  @JoinColumn({ name: "hype_card_id" })
  hypeCard: Relation<GeneratedCard>;

  @Column({ length: 20, default: "valid" })
  status: "valid" | "used" | "cancelled" | "refunded";

  @Column({ name: "checked_in_at", nullable: true, type: "timestamptz" })
  checkedInAt: Date;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;
}
