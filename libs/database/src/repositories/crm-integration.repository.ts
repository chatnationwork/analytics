/**
 * =============================================================================
 * CRM INTEGRATION REPOSITORY
 * =============================================================================
 * 
 * Data access layer for CRM integrations.
 */

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CrmIntegrationEntity } from '../entities/crm-integration.entity';

@Injectable()
export class CrmIntegrationRepository {
  constructor(
    @InjectRepository(CrmIntegrationEntity)
    private readonly repo: Repository<CrmIntegrationEntity>,
  ) {}

  /** Find integration by ID */
  async findById(id: string): Promise<CrmIntegrationEntity | null> {
    return this.repo.findOne({ where: { id } });
  }

  /** Get all integrations for a tenant */
  async findByTenantId(tenantId: string): Promise<CrmIntegrationEntity[]> {
    return this.repo.find({
      where: { tenantId },
      order: { createdAt: 'DESC' },
    });
  }

  /** Get active integrations for a tenant */
  async findActiveByTenantId(tenantId: string): Promise<CrmIntegrationEntity[]> {
    return this.repo.find({
      where: { tenantId, isActive: true },
      order: { createdAt: 'DESC' },
    });
  }

  /** Create integration */
  async create(data: Partial<CrmIntegrationEntity>): Promise<CrmIntegrationEntity> {
    const entity = this.repo.create(data);
    return this.repo.save(entity);
  }

  /** Update integration */
  async update(
    id: string,
    data: Partial<CrmIntegrationEntity>,
  ): Promise<CrmIntegrationEntity | null> {
    await this.repo.update(id, data);
    return this.findById(id);
  }

  /** Delete integration */
  async delete(id: string): Promise<boolean> {
    const result = await this.repo.delete(id);
    return (result.affected ?? 0) > 0;
  }

  /** Update last connected time and clear error */
  async markConnected(id: string): Promise<void> {
    await this.repo.update(id, {
      lastConnectedAt: new Date(),
      lastError: null,
    });
  }

  /** Update last error */
  async markError(id: string, error: string): Promise<void> {
    await this.repo.update(id, { lastError: error });
  }
}
