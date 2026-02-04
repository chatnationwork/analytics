/**
 * =============================================================================
 * USER ENTITY
 * =============================================================================
 *
 * Represents a user account in the analytics platform.
 *
 * TABLE: users
 *
 * AUTHENTICATION:
 * --------------
 * - Email-based authentication with bcrypt password hashing
 * - Can belong to multiple tenants via TenantMembership
 */

import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from "typeorm";

@Entity("users")
export class UserEntity {
  /** Auto-generated user ID */
  @PrimaryGeneratedColumn("uuid")
  id: string;

  /**
   * User's email address.
   * Used for login and notifications.
   */
  @Column({ unique: true })
  @Index()
  email: string;

  /**
   * Bcrypt-hashed password.
   * Never stored or returned in plain text.
   */
  @Column()
  passwordHash: string;

  /** User's display name */
  @Column({ nullable: true })
  name: string;

  /** Email verification status */
  @Column({ default: false })
  emailVerified: boolean;

  /** Profile picture URL */
  @Column({ nullable: true })
  avatarUrl: string;

  /** When the user was created */
  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date;

  /** When the user was last updated */
  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt: Date;

  /** Last login timestamp */
  @Column({ type: "timestamptz", nullable: true })
  lastLoginAt: Date;

  /**
   * Whether two-factor authentication (WhatsApp code) is enabled.
   * When true, login requires a code sent to phone via WhatsApp.
   */
  @Column({ default: false })
  twoFactorEnabled: boolean;

  /**
   * Phone number for 2FA (WhatsApp). Stored as digits only (e.g. 254712345678).
   * Required when twoFactorEnabled is true.
   */
  @Column({ type: "varchar", length: 20, nullable: true })
  phone: string | null;

  /**
   * When the user last set or changed their password.
   * Used with tenant passwordExpiryDays to force password change when stale.
   */
  @Column({ type: "timestamptz", nullable: true })
  passwordChangedAt: Date | null;
}
