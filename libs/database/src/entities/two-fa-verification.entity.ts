/**
 * =============================================================================
 * TWO-FA VERIFICATION ENTITY
 * =============================================================================
 *
 * Stores pending 2FA codes for login. After password check, when user has 2FA
 * enabled we create a row with a token; user receives code via WhatsApp and
 * submits token + code to complete login.
 *
 * TABLE: two_fa_verification
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

@Entity("two_fa_verification")
@Index(["token"], { unique: true })
@Index(["expiresAt"])
export class TwoFaVerificationEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  /** One-time token returned to client; used in verify step */
  @Column("uuid", { unique: true })
  token: string;

  @Column("uuid")
  userId: string;

  @ManyToOne(() => UserEntity, { onDelete: "CASCADE" })
  @JoinColumn({ name: "userId" })
  user: UserEntity;

  /** 6-digit code sent via WhatsApp */
  @Column("varchar", { length: 10 })
  code: string;

  @Column({ type: "timestamptz" })
  expiresAt: Date;
}
