/**
 * Contact note – agent-added notes about a contact. Traceable to author and time.
 */

import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { UserEntity } from "./user.entity";

@Entity("contact_notes")
@Index(["tenantId", "contactId"])
export class ContactNoteEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ length: 50 })
  tenantId: string;

  @Column({ length: 100 })
  contactId: string;

  @Column("uuid")
  authorId: string;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: "authorId" })
  author: UserEntity;

  @Column("text")
  content: string;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date;
}
