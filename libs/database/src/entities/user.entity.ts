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
} from 'typeorm';

@Entity('users')
export class UserEntity {
  /** Auto-generated user ID */
  @PrimaryGeneratedColumn('uuid')
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
  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  /** When the user was last updated */
  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  /** Last login timestamp */
  @Column({ type: 'timestamptz', nullable: true })
  lastLoginAt: Date;
}
