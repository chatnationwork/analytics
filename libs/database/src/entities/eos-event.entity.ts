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
import { IdentityEntity } from "@lib/database/entities/identity.entity";
import { ManyToOne } from "typeorm";

export interface VenueSlot {
  id: string;
  name: string;
  type: "standard" | "premium" | "booth";
  location: { x: number; y: number; width: number; height: number };
}

export interface VenueMapConfig {
  grid: { cols: number; rows: number };
  slots: VenueSlot[];
}

@Entity("eos_events")
export class EosEvent {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "organization_id" })
  organizationId: string;

  @Column({ name: "created_by_id", nullable: true })
  createdById: string;

  @Column({ name: "updated_by_id", nullable: true })
  updatedById: string;

  @ManyToOne(() => IdentityEntity)
  @JoinColumn({ name: "created_by_id" })
  createdBy: Relation<IdentityEntity>;

  @ManyToOne(() => IdentityEntity)
  @JoinColumn({ name: "updated_by_id" })
  updatedBy: Relation<IdentityEntity>;

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
   * settings.venue_map_config: VenueMapConfig
   */
  @Column({ type: "jsonb", default: "{}" })
  settings: Record<string, any>;

  @Column({ name: "grace_period_hours", default: 24 })
  gracePeriodHours: number;

  @Column({ name: "grace_period_ends_at", nullable: true, type: "timestamptz" })
  gracePeriodEndsAt: Date;

  @Column({ length: 20, default: "draft" })
  status:
    | "draft"
    | "published"
    | "ended"
    | "grace_period"
    | "completed"
    | "cancelled";

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
