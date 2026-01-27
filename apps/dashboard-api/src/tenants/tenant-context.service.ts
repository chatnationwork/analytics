/**
 * =============================================================================
 * TENANT CONTEXT SERVICE
 * =============================================================================
 * 
 * Resolves the current tenant context for authenticated requests.
 * In a full multi-tenant SaaS, the tenant would come from:
 * - Subdomain (acme.analytics.app)
 * - X-Tenant-ID header
 * - URL path (/t/acme/...)
 * 
 * For simplicity, we use the user's first/primary tenant.
 */

import { Injectable, NotFoundException } from '@nestjs/common';
import { TenantRepository, TenantEntity } from '@lib/database';

export interface TenantContext {
  tenantId: string;
  tenant: TenantEntity;
  role: 'super_admin' | 'admin' | 'auditor' | 'member';
}

@Injectable()
export class TenantContextService {
  constructor(private readonly tenantRepository: TenantRepository) {}

  /**
   * Get primary tenant for a user.
   * Returns the first tenant the user belongs to (owner or member).
   * 
   * In production, you might:
   * - Read from X-Tenant-ID header
   * - Parse from subdomain
   * - Store in session/cookie
   */
  async getTenantForUser(userId: string): Promise<TenantContext> {
    // Get all tenants user belongs to
    const tenants = await this.tenantRepository.findByUserId(userId);

    if (tenants.length === 0) {
      throw new NotFoundException('User does not belong to any organization');
    }

    // Use first tenant as primary
    const tenant = tenants[0];
    const role = await this.tenantRepository.getUserRole(userId, tenant.id);

    return {
      tenantId: tenant.id,
      tenant,
      role: role || 'member',
    };
  }

  /**
   * Get all tenants for a user.
   */
  async getTenantsForUser(userId: string): Promise<TenantEntity[]> {
    return this.tenantRepository.findByUserId(userId);
  }

  /**
   * Verify user has access to a specific tenant.
   */
  async verifyAccess(userId: string, tenantId: string): Promise<boolean> {
    const role = await this.tenantRepository.getUserRole(userId, tenantId);
    return role !== null;
  }
}
