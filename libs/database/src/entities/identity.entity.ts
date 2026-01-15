/**
 * =============================================================================
 * IDENTITY ENTITY
 * =============================================================================
 * 
 * Links anonymous IDs to known users.
 * 
 * TABLE: identities
 * 
 * IDENTITY RESOLUTION:
 * -------------------
 * When a user first visits, they get an anonymous_id (stored in browser).
 * When they log in, we learn their user_id.
 * 
 * This table links them: "anonymous_id X is user_id Y"
 * 
 * This allows us to:
 * - Show a user's complete history (even before they logged in)
 * - Merge activity across devices (desktop and mobile)
 * - Track the journey from anonymous visitor to customer
 */

import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('identities')
@Index(['tenantId', 'anonymousId'])
@Index(['tenantId', 'userId'])
export class IdentityEntity {
  /**
   * Auto-generated primary key.
   * 
   * @PrimaryGeneratedColumn('uuid') - TypeORM generates a UUID automatically.
   * We use this instead of a composite key for simplicity.
   */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Tenant ID for multi-tenancy */
  @Column({ length: 50 })
  tenantId: string;

  /** The anonymous ID (browser ID) */
  @Column({ length: 100 })
  anonymousId: string;

  /** The user ID (logged-in identifier) */
  @Column({ length: 100 })
  userId: string;

  /** When this link was created */
  @CreateDateColumn({ type: 'timestamptz' })
  linkedAt: Date;

  /** How the link was created (e.g., 'identify', 'login') */
  @Column({ length: 20, default: 'identify' })
  linkSource: string;

  /**
   * User traits (denormalized for quick lookup).
   * 
   * Example: { "name": "John", "email": "john@example.com" }
   * 
   * Storing traits here means we don't need a separate users table
   * for basic analytics. For full user profiles, you'd have a
   * separate system.
   */
  @Column('jsonb', { nullable: true })
  traits: Record<string, unknown> | null;
}
