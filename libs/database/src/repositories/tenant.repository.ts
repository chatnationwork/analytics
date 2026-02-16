/**
 * =============================================================================
 * TENANT REPOSITORY
 * =============================================================================
 *
 * Data access layer for tenant management.
 */

import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TenantEntity } from "../entities/tenant.entity";
import {
  TenantMembershipEntity,
  MembershipRole,
} from "../entities/tenant-membership.entity";

@Injectable()
export class TenantRepository {
  constructor(
    @InjectRepository(TenantEntity)
    private readonly tenantRepo: Repository<TenantEntity>,
    @InjectRepository(TenantMembershipEntity)
    private readonly membershipRepo: Repository<TenantMembershipEntity>,
  ) {}

  /** Find tenant by ID */
  async findById(id: string): Promise<TenantEntity | null> {
    return this.tenantRepo.findOne({ where: { id } });
  }

  /** Find tenant by slug */
  async findBySlug(slug: string): Promise<TenantEntity | null> {
    return this.tenantRepo.findOne({ where: { slug } });
  }

  /** Create tenant and add owner membership */
  async createWithOwner(
    data: Partial<TenantEntity>,
    ownerId: string,
  ): Promise<TenantEntity> {
    const tenant = this.tenantRepo.create(data);
    const savedTenant = await this.tenantRepo.save(tenant);

    // Add owner membership
    const membership = this.membershipRepo.create({
      userId: ownerId,
      tenantId: savedTenant.id,
      role: "super_admin",
    });
    await this.membershipRepo.save(membership);

    return savedTenant;
  }

  /** Check if slug is available */
  async slugExists(slug: string): Promise<boolean> {
    const count = await this.tenantRepo.count({ where: { slug } });
    return count > 0;
  }

  /** Get all tenants for a user (only active memberships) */
  async findByUserId(userId: string): Promise<TenantEntity[]> {
    const memberships = await this.membershipRepo.find({
      where: { userId, isActive: true },
      relations: ["tenant"],
    });
    return memberships.map((m) => m.tenant);
  }

  /** Get user's role in a tenant (null if deactivated) */
  async getUserRole(
    userId: string,
    tenantId: string,
  ): Promise<MembershipRole | null> {
    const membership = await this.membershipRepo.findOne({
      where: { userId, tenantId, isActive: true },
    });
    return membership?.role ?? null;
  }

  /** Add member to tenant */
  async addMember(
    tenantId: string,
    userId: string,
    role: MembershipRole,
    invitedBy?: string,
  ): Promise<TenantMembershipEntity> {
    const membership = this.membershipRepo.create({
      tenantId,
      userId,
      role,
      invitedBy: invitedBy ?? null,
    });
    return this.membershipRepo.save(membership);
  }

  /** Get all members of a tenant */
  async getMembers(tenantId: string): Promise<TenantMembershipEntity[]> {
    return this.membershipRepo.find({
      where: { tenantId },
      relations: ["user"],
    });
  }

  /** Update a member's role */
  async updateMemberRole(
    tenantId: string,
    userId: string,
    role: MembershipRole,
  ): Promise<TenantMembershipEntity | null> {
    const membership = await this.membershipRepo.findOne({
      where: { tenantId, userId },
    });
    if (!membership) return null;
    membership.role = role;
    await this.membershipRepo.save(membership);
    return membership;
  }

  /** Remove a member from a tenant */
  async removeMember(tenantId: string, userId: string): Promise<boolean> {
    const result = await this.membershipRepo.delete({ tenantId, userId });
    return (result.affected ?? 0) > 0;
  }

  /** Count members with a given role in a tenant (active only) */
  async countMembersWithRole(
    tenantId: string,
    role: MembershipRole,
  ): Promise<number> {
    return this.membershipRepo.count({
      where: { tenantId, role, isActive: true },
    });
  }

  /** Set membership active flag (deactivate/reactivate) */
  async setMemberActive(
    tenantId: string,
    userId: string,
    isActive: boolean,
  ): Promise<TenantMembershipEntity | null> {
    const membership = await this.membershipRepo.findOne({
      where: { tenantId, userId },
    });
    if (!membership) return null;
    membership.isActive = isActive;
    await this.membershipRepo.save(membership);
    return membership;
  }

  /** Get a single membership */
  async getMembership(
    tenantId: string,
    userId: string,
  ): Promise<TenantMembershipEntity | null> {
    return this.membershipRepo.findOne({
      where: { tenantId, userId },
      relations: ["user"],
    });
  }

  /**
   * Find the single tenant in a single-tenant deployment.
   * Throws if no tenant exists — the app must be bootstrapped first.
   */
  async findSingleTenant(): Promise<TenantEntity> {
    const tenant = await this.tenantRepo.findOne({ where: {} });
    if (!tenant) {
      throw new Error(
        'No tenant found. The application must have at least one tenant.',
      );
    }
    return tenant;
  }

  /** Update tenant */
  async update(
    id: string,
    data: Partial<TenantEntity>,
  ): Promise<TenantEntity | null> {
    await this.tenantRepo.update(id, data);
    return this.findById(id);
  }

  /** Count total tenants */
  async count(): Promise<number> {
    return this.tenantRepo.count();
  }
}
