/**
 * =============================================================================
 * AUDIT SERVICE
 * =============================================================================
 *
 * Wraps AuditLogRepository and provides a simple API for recording audit events
 * from the backend (auth, config, chat lifecycle). Accepts optional request
 * context (IP, userAgent) for attribution.
 */

import { Injectable } from "@nestjs/common";
import { AuditLogRepository } from "@lib/database";
import type { AuditActorType } from "@lib/database";

export const AuditActions = {
  AUTH_LOGIN: "auth.login",
  AUTH_LOGIN_FAILURE: "auth.login_failure",
  CONFIG_TEAM_CREATED: "config.team.created",
  CONFIG_TEAM_UPDATED: "config.team.updated",
  CONFIG_TEAM_DELETED: "config.team.deleted",
  CONFIG_TEAM_DISABLED: "config.team.disabled",
  CONFIG_TEAM_ENABLED: "config.team.enabled",
  CHAT_SESSION_ASSIGNED: "chat.session.assigned",
  CHAT_SESSION_RESOLVED: "chat.session.resolved",
  CHAT_SESSION_TRANSFERRED: "chat.session.transferred",
  CONTACT_PROFILE_UPDATED: "contact.profile.updated",
} as const;

/** Request context for audit entries (IP, user agent) */
export interface AuditRequestContext {
  ip?: string | null;
  userAgent?: string | null;
}

export interface LogAuditParams {
  tenantId: string;
  actorId?: string | null;
  actorType: AuditActorType;
  action: string;
  resourceType?: string | null;
  resourceId?: string | null;
  details?: Record<string, unknown> | null;
  requestContext?: AuditRequestContext;
}

@Injectable()
export class AuditService {
  constructor(private readonly auditLogRepository: AuditLogRepository) {}

  /**
   * Record an audit event. Fire-and-forget: logs errors but does not throw
   * so that audit failures do not break the main flow.
   */
  async log(params: LogAuditParams): Promise<void> {
    try {
      await this.auditLogRepository.create({
        tenantId: params.tenantId,
        actorId: params.actorId ?? null,
        actorType: params.actorType,
        action: params.action,
        resourceType: params.resourceType ?? null,
        resourceId: params.resourceId ?? null,
        details: params.details ?? null,
        ip: params.requestContext?.ip ?? null,
        userAgent: params.requestContext?.userAgent ?? null,
      });
    } catch (err) {
      // Audit must not break the main flow
      console.error("[AuditService] Failed to write audit log:", err);
    }
  }

  /**
   * List audit logs for a tenant with optional filters and pagination.
   */
  async list(
    tenantId: string,
    options: {
      startDate?: Date;
      endDate?: Date;
      action?: string;
      actorId?: string;
      resourceType?: string;
      resourceId?: string;
      page?: number;
      limit?: number;
    } = {},
  ) {
    return this.auditLogRepository.list(tenantId, options);
  }
}
