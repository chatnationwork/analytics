/**
 * =============================================================================
 * CRM INTEGRATION ENTITY
 * =============================================================================
 *
 * Stores per-tenant CRM API credentials.
 *
 * TABLE: crm_integrations
 *
 * SECURITY:
 * --------
 * - API keys are encrypted at rest using AES-256-GCM
 * - Decrypted only when making API calls
 * - Never returned in API responses
 *
 * MULTI-CRM SUPPORT:
 * -----------------
 * A tenant can have multiple CRM integrations for:
 * - Different WhatsApp Business accounts
 * - Production vs staging environments
 * - Department-specific CRMs
 */

import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { TenantEntity } from "./tenant.entity";

@Entity("crm_integrations")
@Index(["tenantId"])
export class CrmIntegrationEntity {
  /** Auto-generated integration ID */
  @PrimaryGeneratedColumn("uuid")
  id: string;

  /** Tenant this integration belongs to */
  @Column("uuid")
  tenantId: string;

  /**
   * Human-readable name for identification.
   * e.g., "Production WhatsApp", "Sales CRM"
   */
  @Column()
  name: string;

  /**
   * CRM API base URL.
   * e.g., "https://crm.chatnation.co.ke"
   */
  @Column()
  apiUrl: string;

  /**
   * Link to this CRM's webview base pages.
   * Used when sending users to the CRM webview (e.g. in-app or in-chat links); differs per CRM.
   */
  @Column({ type: "varchar", length: 500, nullable: true })
  webLink: string | null;

  /**
   * CSAT (customer satisfaction) survey link sent to the user when a chat is resolved.
   * If not set, we use webLink + '/csat'. If set, this exact URL is used (allows custom path/spelling).
   */
  @Column({ type: "varchar", length: 500, nullable: true })
  csatLink: string | null;

  /**
   * Provider-specific configuration.
   * Stores: phoneNumberId, phoneNumber, wabaId, verifyToken, etc.
   */
  @Column("jsonb", { nullable: true })
  config: Record<string, any> | null;

  /**
   * AES-256-GCM encrypted API key.
   * Format: iv:encryptedData:authTag (base64 encoded)
   */
  @Column()
  apiKeyEncrypted: string;

  /** Whether this integration is active */
  @Column({ default: true })
  isActive: boolean;

  /** Last successful connection time */
  @Column({ type: "timestamptz", nullable: true })
  lastConnectedAt: Date | null;

  @Column({ type: "text", nullable: true })
  lastError: string | null;

  /** Health status of the integration */
  @Column({
    type: "varchar",
    length: 50,
    default: "healthy",
  })
  healthStatus: "healthy" | "auth_error" | "rate_limited";

  /** Last time the auth status was verified */
  @Column({ type: "timestamptz", nullable: true })
  authStatusLastChecked: Date | null;

  /** When the integration was created */
  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date;

  /** When the integration was last updated */
  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt: Date;

  // Relations

  @ManyToOne(() => TenantEntity, { onDelete: "CASCADE" })
  @JoinColumn({ name: "tenantId" })
  tenant: TenantEntity;
}
