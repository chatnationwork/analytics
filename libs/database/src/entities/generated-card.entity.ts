import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from "typeorm";

@Entity("generated_cards")
@Index(["organizationId"])
export class GeneratedCard {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "organization_id" })
  organizationId: string;

  @Column({ name: "template_id", nullable: true })
  templateId: string;

  @Column({ name: "input_data", type: "jsonb", default: {} })
  inputData: Record<string, any>;

  @Column({ name: "output_url", nullable: true })
  outputUrl: string;

  @Column({ length: 20, default: "pending" })
  status: "pending" | "completed" | "failed";

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;
}
