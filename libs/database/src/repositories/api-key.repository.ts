/**
 * =============================================================================
 * API KEY REPOSITORY
 * =============================================================================
 * 
 * Data access layer for API keys.
 */

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApiKeyEntity } from '../entities/api-key.entity';

@Injectable()
export class ApiKeyRepository {
  constructor(
    @InjectRepository(ApiKeyEntity)
    private readonly repo: Repository<ApiKeyEntity>,
  ) {}

  /** Find key by hash (for validation) */
  async findByHash(keyHash: string): Promise<ApiKeyEntity | null> {
    return this.repo.findOne({
      where: { keyHash, isActive: true },
      relations: ['tenant', 'project'],
    });
  }

  /** Find key by prefix (for display in UI) */
  async findByPrefix(keyPrefix: string): Promise<ApiKeyEntity | null> {
    return this.repo.findOne({ where: { keyPrefix } });
  }

  /** Get all keys for a tenant */
  async findByTenantId(tenantId: string): Promise<ApiKeyEntity[]> {
    return this.repo.find({
      where: { tenantId },
      order: { createdAt: 'DESC' },
    });
  }

  /** Create key */
  async create(data: Partial<ApiKeyEntity>): Promise<ApiKeyEntity> {
    const entity = this.repo.create(data);
    return this.repo.save(entity);
  }

  /** Revoke key (soft delete) */
  async revoke(id: string): Promise<boolean> {
    const result = await this.repo.update(id, { isActive: false });
    return (result.affected ?? 0) > 0;
  }

  /** Delete key (hard delete) */
  async delete(id: string): Promise<boolean> {
    const result = await this.repo.delete(id);
    return (result.affected ?? 0) > 0;
  }

  /** Update last used timestamp */
  async updateLastUsed(id: string): Promise<void> {
    await this.repo.update(id, { lastUsedAt: new Date() });
  }

  /** Check if key hash exists */
  async hashExists(keyHash: string): Promise<boolean> {
    const count = await this.repo.count({ where: { keyHash } });
    return count > 0;
  }
}
