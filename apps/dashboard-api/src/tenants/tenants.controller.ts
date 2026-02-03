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
  Post,
  Patch,
  Delete,
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
   */
  @Patch("current")
  async updateCurrent(
    @CurrentUser() user: AuthUser,
    @Body() body: { name?: string; settings?: Record<string, unknown> },
  ) {
    const context = await this.tenantContextService.getTenantForUser(user.id);

    if (context.role !== "super_admin" && context.role !== "admin") {
      throw new Error("Insufficient permissions");
    }

    const updated = await this.tenantRepository.update(context.tenantId, body);
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
      avatarUrl: m.user.avatarUrl,
      invitedBy: m.invitedBy ?? undefined,
      invitedByName: m.invitedBy
        ? (inviterMap.get(m.invitedBy)?.name ?? undefined)
        : undefined,
    }));
  }

  /**
   * Update a member's role (requires admin or super_admin).
   */
  @Patch("current/members/:userId")
  async updateMemberRole(
    @CurrentUser() user: AuthUser,
    @Param("userId") targetUserId: string,
    @Body() body: { role: MembershipRole },
  ) {
    const context = await this.tenantContextService.getTenantForUser(user.id);
    if (context.role !== "super_admin" && context.role !== "admin") {
      throw new ForbiddenException("Insufficient permissions");
    }
    if (!body.role) {
      throw new BadRequestException("role is required");
    }
    const validRoles: MembershipRole[] = [
      "super_admin",
      "admin",
      "auditor",
      "member",
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
   * Remove a member from the current tenant (requires admin or super_admin).
   */
  @Delete("current/members/:userId")
  async removeMember(
    @CurrentUser() user: AuthUser,
    @Param("userId") targetUserId: string,
  ) {
    const context = await this.tenantContextService.getTenantForUser(user.id);
    if (context.role !== "super_admin" && context.role !== "admin") {
      throw new ForbiddenException("Insufficient permissions");
    }
    if (targetUserId === user.id) {
      throw new BadRequestException("You cannot remove yourself");
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
      throw new BadRequestException("Cannot remove the last super admin");
    }
    await this.tenantRepository.removeMember(context.tenantId, targetUserId);
    return { success: true };
  }
}
