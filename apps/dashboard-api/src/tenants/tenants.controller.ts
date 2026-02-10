/**
 * =============================================================================
 * TENANTS CONTROLLER
 * =============================================================================
 *
 * REST API endpoints for tenant management.
 */

import {
  Controller,
  Get,
  Patch,
  Post,
  Body,
  UseGuards,
  Param,
  ForbiddenException,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { JwtAuthGuard, CurrentUser, AuthUser } from "../auth";
import { TenantRepository, UserRepository } from "@lib/database";
import { TenantContextService } from "./tenant-context.service";
import { MembershipRole } from "@lib/database/entities/tenant-membership.entity";

function deepMerge(
  target: Record<string, unknown>,
  source: Record<string, unknown>,
): Record<string, unknown> {
  const out = { ...target };
  for (const key of Object.keys(source)) {
    const t = out[key];
    const s = source[key];
    if (
      s !== null &&
      typeof s === "object" &&
      !Array.isArray(s) &&
      t !== null &&
      typeof t === "object" &&
      !Array.isArray(t)
    ) {
      out[key] = deepMerge(
        t as Record<string, unknown>,
        s as Record<string, unknown>,
      );
    } else {
      out[key] = s;
    }
  }
  return out;
}

@Controller("tenants")
@UseGuards(JwtAuthGuard)
export class TenantsController {
  constructor(
    private readonly tenantRepository: TenantRepository,
    private readonly userRepository: UserRepository,
    private readonly tenantContextService: TenantContextService,
  ) {}

  /**
   * List all tenants the user belongs to.
   */
  @Get()
  async list(@CurrentUser() user: AuthUser) {
    const tenants = await this.tenantContextService.getTenantsForUser(user.id);
    return tenants.map((t) => ({
      id: t.id,
      name: t.name,
      slug: t.slug,
      plan: t.plan,
    }));
  }

  /**
   * Get current tenant context.
   */
  @Get("current")
  async getCurrent(@CurrentUser() user: AuthUser) {
    const context = await this.tenantContextService.getTenantForUser(user.id);
    return {
      tenantId: context.tenantId,
      name: context.tenant.name,
      slug: context.tenant.slug,
      plan: context.tenant.plan,
      role: context.role,
      settings: context.tenant.settings,
    };
  }

  /**
   * Update current tenant settings.
   * Merges body.settings into existing tenant.settings so partial updates do not wipe other keys.
   * Updating settings.passwordComplexity requires permission settings.password_complexity (super admins).
   */
  @Patch("current")
  async updateCurrent(
    @CurrentUser() user: AuthUser,
    @Body() body: { name?: string; settings?: Record<string, unknown> },
  ) {
    const context = await this.tenantContextService.getTenantForUser(user.id);

    if (context.role !== "super_admin" && context.role !== "system_admin") {
      throw new ForbiddenException("Insufficient permissions");
    }

    // Updating password complexity requires the dedicated permission (super admins only by default)
    if (
      body.settings !== undefined &&
      Object.prototype.hasOwnProperty.call(body.settings, "passwordComplexity")
    ) {
      const hasPermission = user.permissions?.global?.includes(
        "settings.password_complexity",
      );
      if (!hasPermission) {
        throw new ForbiddenException(
          "You need permission to configure password complexity (settings.password_complexity)",
        );
      }
    }
    // Updating "Require 2FA for organization" requires settings.two_factor (super admins only by default)
    if (
      body.settings !== undefined &&
      Object.prototype.hasOwnProperty.call(body.settings, "twoFactorRequired")
    ) {
      const hasPermission = user.permissions?.global?.includes(
        "settings.two_factor",
      );
      if (!hasPermission) {
        throw new ForbiddenException(
          "You need permission to enable or disable organization-wide 2FA (settings.two_factor)",
        );
      }
    }

    const payload: { name?: string; settings?: Record<string, unknown> } = {
      ...(body.name !== undefined && { name: body.name }),
    };
    if (body.settings !== undefined) {
      const existing = (context.tenant.settings ?? {}) as Record<
        string,
        unknown
      >;
      payload.settings = deepMerge(existing, body.settings);
    }

    const updated = await this.tenantRepository.update(
      context.tenantId,
      payload,
    );
    return {
      id: updated?.id,
      name: updated?.name,
      slug: updated?.slug,
      plan: updated?.plan,
      settings: updated?.settings,
    };
  }

  /**
   * List members of the current tenant (with inviter info)
   */
  @Get("current/members")
  async listMembers(@CurrentUser() user: AuthUser) {
    const context = await this.tenantContextService.getTenantForUser(user.id);
    const members = await this.tenantRepository.getMembers(context.tenantId);
    const inviterIds = [
      ...new Set(members.map((m) => m.invitedBy).filter(Boolean)),
    ] as string[];
    const inviterUsers =
      inviterIds.length > 0
        ? await Promise.all(
            inviterIds.map((id) => this.userRepository.findById(id)),
          )
        : [];
    const inviterMap = new Map<
      string,
      { name: string | null; email: string }
    >();
    inviterUsers.forEach((u, i) => {
      if (u && inviterIds[i])
        inviterMap.set(inviterIds[i], { name: u.name ?? null, email: u.email });
    });

    return members.map((m) => ({
      userId: m.userId,
      name: m.user.name,
      email: m.user.email,
      role: m.role,
      joinedAt: m.joinedAt,
      isActive: m.isActive,
      avatarUrl: m.user.avatarUrl,
      invitedBy: m.invitedBy ?? undefined,
      invitedByName: m.invitedBy
        ? (inviterMap.get(m.invitedBy)?.name ?? undefined)
        : undefined,
    }));
  }

  /**
   * Update a member's role (requires system_admin or super_admin).
   */
  @Patch("current/members/:userId")
  async updateMemberRole(
    @CurrentUser() user: AuthUser,
    @Param("userId") targetUserId: string,
    @Body() body: { role: MembershipRole },
  ) {
    const context = await this.tenantContextService.getTenantForUser(user.id);
    if (context.role !== "super_admin" && context.role !== "system_admin") {
      throw new ForbiddenException("Insufficient permissions");
    }
    if (!body.role) {
      throw new BadRequestException("role is required");
    }
    const validRoles: MembershipRole[] = [
      "super_admin",
      "system_admin",
      "developer",
      "auditor",
      "agent",
    ];
    if (!validRoles.includes(body.role)) {
      throw new BadRequestException("Invalid role");
    }
    const updated = await this.tenantRepository.updateMemberRole(
      context.tenantId,
      targetUserId,
      body.role,
    );
    if (!updated) throw new NotFoundException("Member not found");
    return { userId: updated.userId, role: updated.role };
  }

  /**
   * Deactivate a member (revoke access; they stay in the list and can be reactivated).
   */
  @Patch("current/members/:userId/deactivate")
  async deactivateMember(
    @CurrentUser() user: AuthUser,
    @Param("userId") targetUserId: string,
  ) {
    const context = await this.tenantContextService.getTenantForUser(user.id);
    if (context.role !== "super_admin" && context.role !== "system_admin") {
      throw new ForbiddenException("Insufficient permissions");
    }
    if (targetUserId === user.id) {
      throw new BadRequestException("You cannot deactivate yourself");
    }
    const targetMembership = await this.tenantRepository.getMembership(
      context.tenantId,
      targetUserId,
    );
    if (!targetMembership) throw new NotFoundException("Member not found");
    const superAdminCount = await this.tenantRepository.countMembersWithRole(
      context.tenantId,
      "super_admin",
    );
    if (targetMembership.role === "super_admin" && superAdminCount <= 1) {
      throw new BadRequestException("Cannot deactivate the last super admin");
    }
    const updated = await this.tenantRepository.setMemberActive(
      context.tenantId,
      targetUserId,
      false,
    );
    if (!updated) throw new NotFoundException("Member not found");
    return { success: true, isActive: false };
  }

  /**
   * Reactivate a deactivated member.
   */
  @Patch("current/members/:userId/reactivate")
  async reactivateMember(
    @CurrentUser() user: AuthUser,
    @Param("userId") targetUserId: string,
  ) {
    const context = await this.tenantContextService.getTenantForUser(user.id);
    if (context.role !== "super_admin" && context.role !== "system_admin") {
      throw new ForbiddenException("Insufficient permissions");
    }
    const updated = await this.tenantRepository.setMemberActive(
      context.tenantId,
      targetUserId,
      true,
    );
    if (!updated) throw new NotFoundException("Member not found");
    return { success: true, isActive: true };
  }
}
