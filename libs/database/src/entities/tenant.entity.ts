/**
 * =============================================================================
 * TENANT ENTITY
 * =============================================================================
 * 
 * Represents an organization/workspace in the multi-tenant system.
 * 
 * TABLE: tenants
 * 
 * MULTI-TENANCY MODEL:
 * -------------------
 * Tenant (Organization)
 *   └── Members (Users with roles)
 *   └── Projects (Analytics projects)
 *   └── CRM Integrations (WhatsApp CRM connections)
 * 
 * DEPLOYMENT MODES:
 * ----------------
 * - SaaS: Multiple tenants share the platform
 * - White-label: Single tenant with custom branding
 */

import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/** White-label/branding settings for a tenant */
export interface TenantSettings {
  /** Custom logo URL */
  logoUrl?: string;
  /** Primary brand color (hex) */
  primaryColor?: string;
  /** Custom app name for white-label */
  appName?: string;
  /** Custom domain for white-label */
  customDomain?: string;
  /** Timezone for reports */
  timezone?: string;
  /** Session management configuration */
  session?: SessionSettings;
}

/** Configuration for session management */
export interface SessionSettings {
  /** Maximum session duration in minutes. Default: 10080 (7 days) */
  maxDurationMinutes: number;
  
  /** Inactivity timeout in minutes. Default: 30 */
  inactivityTimeoutMinutes: number;
  
  /** 
   * Timestamp when sessions were last revoked/reset.
   * Any token issued before this time will be considered invalid.
   */
  sessionsRevokedAt?: string; // ISO Date string
}

/** Available subscription plans */
export type TenantPlan = 'free' | 'starter' | 'pro' | 'enterprise';

@Entity('tenants')
export class TenantEntity {
  /** Auto-generated tenant ID */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** 
   * URL-friendly unique identifier.
   * Used in URLs like /t/acme-corp/dashboard
   */
  @Column({ unique: true })
  @Index()
  slug: string;

  /** Organization display name */
  @Column()
  name: string;

  /** Subscription plan */
  @Column({ default: 'free' })
  plan: TenantPlan;

  /** 
   * Flexible settings as JSON.
   * Includes white-label branding options.
   */
  @Column('jsonb', { nullable: true })
  settings: TenantSettings | null;

  /** Whether the tenant is active */
  @Column({ default: true })
  isActive: boolean;

  /** When the tenant was created */
  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  /** When the tenant was last updated */
  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
