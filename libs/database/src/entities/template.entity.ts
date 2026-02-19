import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from "typeorm";

export enum TemplateStatus {
  APPROVED = "approved",
  REJECTED = "rejected",
  PENDING = "pending",
}

@Entity("templates")
@Index(["tenantId", "name"])
@Index(["tenantId", "status"])
export class TemplateEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "varchar", length: 50 })
  tenantId: string;

  @Column({ type: "varchar", length: 255 })
  name: string;

  @Column({ type: "varchar", length: 10 })
  language: string;

  @Column({ type: "varchar", length: 50, nullable: true })
  category: string | null;

  /**
   * The raw WhatsApp template JSON structure.
   * e.g. { type: "template", template: { ... } }
   */
  @Column("jsonb")
  structure: Record<string, unknown>;

  /**
   * Extracted body text with placeholders.
   * e.g. "Dear {{1}}, welcome..."
   */
  @Column({ type: "text", nullable: true })
  bodyText: string | null;

  /**
   * List of variables detected in the template.
   * e.g. ["1", "2"] or ["name", "date"]
   */
  @Column("jsonb", { default: [] })
  variables: string[];

  @Column({
    type: "enum",
    enum: TemplateStatus,
    default: TemplateStatus.APPROVED,
  })
  status: TemplateStatus;

  @Column({ type: "uuid", nullable: true })
  createdBy: string | null;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt: Date;
}
