/**
 * =============================================================================
 * PROJECT ENTITY
 * =============================================================================
 * 
 * Represents an analytics project within a tenant.
 * 
 * TABLE: projects
 * 
 * MULTI-TENANCY HIERARCHY:
 * -----------------------
 * Tenant (Organization)
 *   └── Project (e.g., "Production", "Staging")
 *         └── Events
 * 
 * A tenant can have multiple projects to separate environments
 * or different applications.
 * 
 * WRITE KEYS:
 * ----------
 * Each project has a unique write key used by the SDK.
 * This key:
 * - Identifies which project events belong to
 * - Must be included in all SDK requests
 * - Can be rotated if compromised
 */

import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('projects')
export class ProjectEntity {
  /** Auto-generated project ID */
  @PrimaryGeneratedColumn('uuid')
  projectId: string;

  /** Tenant (organization) this project belongs to */
  @Column('uuid')
  tenantId: string;

  /** Human-readable project name */
  @Column({ length: 100 })
  name: string;

  /**
   * Write key for SDK authentication.
   * 
   * This is what the SDK sends to identify the project.
   * Marked unique so each project has a distinct key.
   */
  @Column({ length: 100, unique: true })
  writeKey: string;

  /**
   * Allowed origins for CORS validation.
   * 
   * 'text[]' is PostgreSQL array type.
   * Example: ['https://app.example.com', 'http://localhost:3000']
   * Use ['*'] to allow all origins (not recommended for production).
   */
  @Column('text', { array: true, default: '{}' })
  allowedOrigins: string[];

  /**
   * Project settings as flexible JSON.
   * 
   * Example: { "trackPageViews": true, "sessionTimeout": 1800 }
   */
  @Column('jsonb', { nullable: true })
  settings: Record<string, unknown> | null;

  /** When the project was created */
  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  /**
   * When the project was last updated.
   * 
   * @UpdateDateColumn - TypeORM updates this automatically on every save.
   */
  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
