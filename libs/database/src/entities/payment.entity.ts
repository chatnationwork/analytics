import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Relation,
  Index,
} from "typeorm";
import { IdentityEntity } from "./identity.entity";
import { ContactEntity } from "./contact.entity";

@Entity("payments")
@Index(["organizationId"])
@Index(["contactId"])
@Index(["payableType", "payableId"])
@Index(["status"])
@Index(["checkoutRequestId"], { unique: true })
export class Payment {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  // Tenant scoping
  @Column({ name: "organization_id" })
  organizationId: string;

  // Who paid — link to IdentityEntity (the authenticated user / organizer staff)
  @Column({ name: "identity_id", nullable: true })
  identityId: string;

  @ManyToOne(() => IdentityEntity, { nullable: true })
  @JoinColumn({ name: "identity_id" })
  identity: Relation<IdentityEntity>;

  // Who the payer is as a Contact (attendee / customer)
  @Column({ name: "contact_id", nullable: true })
  contactId: string;

  @ManyToOne(() => ContactEntity, { nullable: true })
  @JoinColumn({ name: "contact_id" })
  contact: Relation<ContactEntity>;

  // Polymorphic reference to the thing being paid for
  // e.g. 'eos_ticket', 'exhibitor_order', 'subscription'
  @Column({ name: "payable_type", length: 50 })
  payableType: string;

  @Column({ name: "payable_id" })
  payableId: string; // FK to the payable entity's UUID

  // Money fields
  @Column({ type: "decimal", precision: 12, scale: 2 })
  amount: number;

  @Column({ length: 3, default: "KES" })
  currency: string;

  // Exchange rate if currency !== KES (for multi-currency support)
  @Column({
    name: "exchange_rate",
    type: "decimal",
    precision: 10,
    scale: 6,
    nullable: true,
  })
  exchangeRate: number;

  @Column({
    name: "amount_kes",
    type: "decimal",
    precision: 12,
    scale: 2,
    nullable: true,
  })
  amountKes: number; // Settled amount in KES

  // Payment method
  @Column({ name: "payment_method", length: 30, default: "mpesa" })
  paymentMethod: "mpesa" | "card" | "bank_transfer" | "cash" | "wallet";

  // M-Pesa specific
  @Column({ name: "phone_number", nullable: true, length: 20 })
  phoneNumber: string;

  @Column({
    name: "checkout_request_id",
    nullable: true,
    length: 100,
    unique: true,
  })
  checkoutRequestId: string;

  @Column({ name: "merchant_request_id", nullable: true, length: 100 })
  merchantRequestId: string;

  @Column({ name: "mpesa_receipt_number", nullable: true, length: 50 })
  mpesaReceiptNumber: string | null;

  // Status
  @Column({ length: 20, default: "pending" })
  status: "pending" | "completed" | "failed" | "cancelled" | "refunded";

  @Column({ name: "failure_reason", nullable: true, type: "text" })
  failureReason: string;

  // Raw M-Pesa callback payload for audit
  @Column({ name: "provider_metadata", nullable: true, type: "jsonb" })
  providerMetadata: Record<string, any>;

  // Timestamps
  @Column({ name: "initiated_at", type: "timestamptz", default: () => "NOW()" })
  initiatedAt: Date;

  @Column({ name: "completed_at", nullable: true, type: "timestamptz" })
  completedAt: Date;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt: Date;
}
