import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  JoinColumn,
  Relation,
} from "typeorm";
import { EosTicketType } from "@lib/database/entities/eos-ticket-type.entity";
import { EosExhibitor } from "@lib/database/entities/eos-exhibitor.entity";

@Entity("eos_events")
export class EosEvent {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "organization_id" })
  organizationId: string;

  @Column({ length: 255 })
  name: string;

  @Column({ nullable: true, length: 100 })
  slug: string;

  @Column({ nullable: true, type: "text" })
  description: string;

  @Column({ name: "starts_at", type: "timestamptz" })
  startsAt: Date;

  @Column({ name: "ends_at", type: "timestamptz" })
  endsAt: Date;

  @Column({ length: 50, default: "Africa/Nairobi" })
  timezone: string;

  @Column({ name: "venue_name", nullable: true, length: 255 })
  venueName: string;

  @Column({ name: "venue_address", nullable: true, type: "text" })
  venueAddress: string;

  @Column({ name: "is_virtual", default: false })
  isVirtual: boolean;

  @Column({ name: "virtual_url", nullable: true, type: "text" })
  virtualUrl: string;

  @Column({ name: "cover_image_url", nullable: true, type: "text" })
  coverImageUrl: string;

  /**
   * settings.hype_card_on_reg: boolean
   * settings.venue_map_config: { grid: { cols, rows }, slots: [{ id, x, y }] }
   */
  @Column({ type: "jsonb", default: "{}" })
  settings: Record<string, any>;

  @Column({ length: 20, default: "draft" })
  status: "draft" | "published" | "cancelled" | "completed";

  @Column({ name: "published_at", nullable: true, type: "timestamptz" })
  publishedAt: Date;

  @OneToMany(() => EosTicketType, (tt: EosTicketType) => tt.event)
  ticketTypes: Relation<EosTicketType>[];

  @OneToMany(() => EosExhibitor, (e: EosExhibitor) => e.event)
  exhibitors: Relation<EosExhibitor>[];

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt: Date;
}
