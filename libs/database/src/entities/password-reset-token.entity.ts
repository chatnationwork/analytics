/**
 * Stores password reset tokens (hashed). When a user requests a reset we create
 * a row with a hashed token and send the plain token in the email link.
 */

import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { UserEntity } from "./user.entity";

@Entity("password_reset_tokens")
@Index(["tokenHash"], { unique: true })
@Index(["expiresAt"])
export class PasswordResetTokenEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  /** SHA-256 hash of the token sent in the email (we never store plain token). */
  @Column("varchar", { length: 64 })
  tokenHash: string;

  @Column("uuid")
  userId: string;

  @ManyToOne(() => UserEntity, { onDelete: "CASCADE" })
  @JoinColumn({ name: "userId" })
  user: UserEntity;

  @Column({ type: "timestamptz" })
  expiresAt: Date;
}
