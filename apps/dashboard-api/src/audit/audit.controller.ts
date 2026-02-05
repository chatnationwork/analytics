/**
 * =============================================================================
 * AUDIT CONTROLLER
 * =============================================================================
 *
 * GET /api/dashboard/audit-logs – list audit logs for the current tenant
 * (JWT-protected, tenant-scoped).
 */

import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import type { AuthUser } from "../auth/auth.service";
import { AuditService } from "./audit.service";

@Controller("audit-logs")
@UseGuards(JwtAuthGuard)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  /**
   * List audit logs for the current tenant with optional filters and pagination.
   */
  @Get()
  async list(
    @CurrentUser() user: AuthUser,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
    @Query("action") action?: string,
    @Query("actorId") actorId?: string,
    @Query("resourceType") resourceType?: string,
    @Query("resourceId") resourceId?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? Math.min(parseInt(limit, 10) || 50, 100) : 50;

    return this.auditService.list(user.tenantId, {
      startDate: start && !isNaN(start.getTime()) ? start : undefined,
      endDate: end && !isNaN(end.getTime()) ? end : undefined,
      action: action?.trim() || undefined,
      actorId: actorId?.trim() || undefined,
      resourceType: resourceType?.trim() || undefined,
      resourceId: resourceId?.trim() || undefined,
      page: pageNum,
      limit: limitNum,
    });
  }
}
