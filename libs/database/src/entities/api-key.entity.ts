/**
 * =============================================================================
 * API KEY ENTITY
 * =============================================================================
 * 
 * Stores API keys for SDK authentication.
 * Replaces the static ALLOWED_WRITE_KEYS env var.
 * 
 * TABLE: api_keys
 * 
 * KEY TYPES:
 * ---------
 * - write: Used by SDK to send events (public, included in client code)
 * - read: Used to query dashboard API (secret, server-side only)
 * 
 * SECURITY:
 * --------
 * - Keys are hashed for storage (like passwords)
 * - Only the prefix is stored in plain text for identification
 * - Full key shown only once upon creation
 */

import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { TenantEntity } from './tenant.entity';
import { ProjectEntity } from './project.entity';

/** API key access level */
export type ApiKeyType = 'write' | 'read';

@Entity('api_keys')
@Index(['tenantId'])
@Index(['keyPrefix'])
export class ApiKeyEntity {
  /** Auto-generated key record ID */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Tenant this key belongs to */
  @Column('uuid')
  tenantId: string;

  /** Project this key is scoped to (optional) */
  @Column('uuid', { nullable: true })
  projectId: string | null;

  /** Human-readable name for the key */
  @Column()
  name: string;

  /** 
   * First 8 characters of the key for identification.
   * e.g., "wk_abc123" -> "wk_abc12"
   */
  @Column()
  keyPrefix: string;

  /** 
   * SHA-256 hash of the full key.
   * Used for validation without storing the key.
   */
  @Column()
  keyHash: string;

  /** Key type (write for SDK, read for API) */
  @Column({ default: 'write' })
  type: ApiKeyType;

  /** Whether this key is active */
  @Column({ default: true })
  isActive: boolean;

  /** When this key was last used */
  @Column({ type: 'timestamptz', nullable: true })
  lastUsedAt: Date | null;

  /** When this key expires (null = never) */
  @Column({ type: 'timestamptz', nullable: true })
  expiresAt: Date | null;

  /** When the key was created */
  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  /** User who created this key */
  @Column('uuid', { nullable: true })
  createdBy: string | null;

  // Relations

  @ManyToOne(() => TenantEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenantId' })
  tenant: TenantEntity;

  @ManyToOne(() => ProjectEntity, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'projectId' })
  project: ProjectEntity | null;
}
