/**
 * =============================================================================
 * TENANT REPOSITORY
 * =============================================================================
 * 
 * Data access layer for tenant management.
 */

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TenantEntity } from '../entities/tenant.entity';
import { TenantMembershipEntity, MembershipRole } from '../entities/tenant-membership.entity';

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
      role: 'owner',
    });
    await this.membershipRepo.save(membership);

    return savedTenant;
  }

  /** Check if slug is available */
  async slugExists(slug: string): Promise<boolean> {
    const count = await this.tenantRepo.count({ where: { slug } });
    return count > 0;
  }

  /** Get all tenants for a user */
  async findByUserId(userId: string): Promise<TenantEntity[]> {
    const memberships = await this.membershipRepo.find({
      where: { userId },
      relations: ['tenant'],
    });
    return memberships.map((m) => m.tenant);
  }

  /** Get user's role in a tenant */
  async getUserRole(userId: string, tenantId: string): Promise<MembershipRole | null> {
    const membership = await this.membershipRepo.findOne({
      where: { userId, tenantId },
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
      relations: ['user'], // Include user details
    });
  }

  /** Update tenant */
  async update(id: string, data: Partial<TenantEntity>): Promise<TenantEntity | null> {
    await this.tenantRepo.update(id, data);
    return this.findById(id);
  }
}
