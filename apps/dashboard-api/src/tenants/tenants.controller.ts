/**
 * =============================================================================
 * TENANTS CONTROLLER
 * =============================================================================
 * 
 * REST API endpoints for tenant management.
 */

import { Controller, Get, Post, Patch, Body, UseGuards, Param } from '@nestjs/common';
import { JwtAuthGuard, CurrentUser, AuthUser } from '../auth';
import { TenantRepository } from '@lib/database';
import { TenantContextService } from './tenant-context.service';

@Controller('tenants')
@UseGuards(JwtAuthGuard)
export class TenantsController {
  constructor(
    private readonly tenantRepository: TenantRepository,
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
  @Get('current')
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
  @Patch('current')
  async updateCurrent(
    @CurrentUser() user: AuthUser,
    @Body() body: { name?: string; settings?: Record<string, unknown> },
  ) {
    const context = await this.tenantContextService.getTenantForUser(user.id);
    
    if (context.role !== 'super_admin' && context.role !== 'admin') {
      throw new Error('Insufficient permissions');
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
   * List members of the current tenant
   */
  @Get('current/members')
  async listMembers(@CurrentUser() user: AuthUser) {
    const context = await this.tenantContextService.getTenantForUser(user.id);
    const members = await this.tenantRepository.getMembers(context.tenantId);
    
    return members.map(m => ({
        userId: m.userId,
        name: m.user.name,
        email: m.user.email,
        role: m.role,
        joinedAt: m.joinedAt,
        avatarUrl: m.user.avatarUrl
    }));
  }
}
