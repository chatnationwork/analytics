import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from "typeorm";

@Entity("import_mapping_templates")
@Index(["tenantId", "name"], { unique: true })
export class ImportMappingTemplate {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "varchar", length: 50 })
  tenantId: string;

  @Column({ type: "varchar", length: 100 })
  name: string;

  /**
   * Mapping of CSV header to contact field.
   * e.g. { "Full Name": "name", "Mobile": "contactId", "Org": "metadata.company" }
   */
  @Column("jsonb")
  mapping: Record<string, string>;

  @Column({ type: "varchar", length: 50, nullable: true })
  createdBy: string;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date;
}
