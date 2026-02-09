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
} from "typeorm";

/** Navigation label overrides keyed by route path (e.g. "/agent-inbox" -> "Inbox") */
export type NavLabels = Record<string, string>;

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
  /** Custom labels for sidebar nav items (route path -> label) */
  navLabels?: NavLabels;
  /** Password complexity required for new users (e.g. when claiming an invite). Super-admin configurable. */
  passwordComplexity?: PasswordComplexityConfig;
  /** Require users to change password after this many days. Null/undefined = no expiry. */
  passwordExpiryDays?: number | null;
  /** When true, all users in the org must have 2FA enabled (phone set). Only configurable by users with settings.two_factor. */
  twoFactorRequired?: boolean;
  /** When true, agents must provide a reason when transferring a chat. Admin-configurable. */
  transferReasonRequired?: boolean;
  /** Configurable copy for system-sent messages (handover, invite, login verify, CSAT, etc.). */
  systemMessages?: SystemMessagesConfig;
}

/** Configurable system message copy. All fields optional; missing values fall back to built-in defaults. */
export interface SystemMessagesConfig {
  /** WhatsApp text when user is connected to an agent (handover). */
  handoverMessage?: string;
  /** Default out-of-office message when team schedule is closed (used if team has no custom message). */
  outOfOfficeMessage?: string;
  /** Invite email subject line. */
  inviteEmailSubject?: string;
  /** Invite email body (main paragraph). InviteUrl and inviter/workspace are inserted by the app. */
  inviteEmailBody?: string;
  /** Login verification email subject (new device/browser). */
  loginVerifySubject?: string;
  /** Login verification email body paragraph. VerifyUrl is inserted by the app. */
  loginVerifyBody?: string;
  /** CSAT WhatsApp CTA header. */
  csatHeader?: string;
  /** CSAT WhatsApp CTA body. */
  csatBody?: string;
  /** CSAT WhatsApp CTA footer. */
  csatFooter?: string;
  /** CSAT WhatsApp CTA button label. */
  csatButtonText?: string;
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

  /** When true, only one active session per user; new login requires identity verification. */
  singleLoginEnforced?: boolean;
}

/** Password complexity rules for new users (invite claim, etc.). Stored in tenant.settings.passwordComplexity. */
export interface PasswordComplexityConfig {
  /** Minimum length. Default 8. */
  minLength: number;
  /** Require at least one uppercase letter */
  requireUppercase?: boolean;
  /** Require at least one lowercase letter */
  requireLowercase?: boolean;
  /** Require at least one digit */
  requireNumber?: boolean;
  /** Require at least one special character (non-alphanumeric) */
  requireSpecial?: boolean;
  /** Maximum length. Optional. */
  maxLength?: number;
}

/** Available subscription plans */
export type TenantPlan = "free" | "starter" | "pro" | "enterprise";

@Entity("tenants")
export class TenantEntity {
  /** Auto-generated tenant ID */
  @PrimaryGeneratedColumn("uuid")
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
  @Column({ default: "free" })
  plan: TenantPlan;

  /**
   * Flexible settings as JSON.
   * Includes white-label branding options.
   */
  @Column("jsonb", { nullable: true })
  settings: TenantSettings | null;

  /** Whether the tenant is active */
  @Column({ default: true })
  isActive: boolean;

  /** When the tenant was created */
  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date;

  /** When the tenant was last updated */
  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt: Date;
}
