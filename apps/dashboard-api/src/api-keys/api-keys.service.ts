/**
 * =============================================================================
 * API KEYS SERVICE
 * =============================================================================
 * 
 * Business logic for API key management.
 * Generates, validates, and revokes API keys for SDK authentication.
 */

import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { ApiKeyRepository } from '@lib/database';
import * as crypto from 'crypto';

export interface GeneratedApiKey {
  id: string;
  name: string;
  key: string; // Full key - only shown once!
  keyPrefix: string;
  type: 'write' | 'read';
  createdAt: string;
}

@Injectable()
export class ApiKeysService {
  private readonly logger = new Logger(ApiKeysService.name);

  constructor(private readonly apiKeyRepository: ApiKeyRepository) {}

  /**
   * Generate a new API key.
   * The full key is only returned once - we only store the hash.
   */
  async generateKey(
    tenantId: string,
    name: string,
    type: 'write' | 'read' = 'write',
    projectId?: string,
    createdBy?: string,
  ): Promise<GeneratedApiKey> {
    // Generate random key: prefix_randomBytes
    const prefix = type === 'write' ? 'wk' : 'rk';
    const randomPart = crypto.randomBytes(24).toString('base64url');
    const fullKey = `${prefix}_${randomPart}`;
    
    // Store only the prefix (for identification) and hash (for validation)
    const keyPrefix = fullKey.substring(0, 10);
    const keyHash = crypto.createHash('sha256').update(fullKey).digest('hex');

    const apiKey = await this.apiKeyRepository.create({
      tenantId,
      projectId: projectId || null,
      name,
      keyPrefix,
      keyHash,
      type,
      isActive: true,
      createdBy: createdBy || null,
    });

    this.logger.log(`Generated new ${type} API key: ${keyPrefix}... for tenant ${tenantId}`);

    return {
      id: apiKey.id,
      name: apiKey.name,
      key: fullKey, // Only returned once!
      keyPrefix,
      type,
      createdAt: apiKey.createdAt.toISOString(),
    };
  }

  /**
   * List all API keys for a tenant.
   * Never returns the actual key - only prefix for identification.
   */
  async listKeys(tenantId: string) {
    const keys = await this.apiKeyRepository.findByTenantId(tenantId);
    return keys.map((k) => ({
      id: k.id,
      name: k.name,
      keyPrefix: k.keyPrefix + '...',
      type: k.type,
      isActive: k.isActive,
      lastUsedAt: k.lastUsedAt?.toISOString() ?? null,
      createdAt: k.createdAt.toISOString(),
    }));
  }

  /**
   * Revoke an API key.
   */
  async revokeKey(id: string, tenantId: string): Promise<void> {
    const key = await this.apiKeyRepository.findByPrefix(id);
    
    // For now, use the prefix as lookup - in production, lookup by ID
    const keys = await this.apiKeyRepository.findByTenantId(tenantId);
    const keyToRevoke = keys.find((k) => k.id === id);

    if (!keyToRevoke) {
      throw new NotFoundException('API key not found');
    }

    if (keyToRevoke.tenantId !== tenantId) {
      throw new ForbiddenException('Access denied');
    }

    await this.apiKeyRepository.revoke(id);
    
    this.logger.log(`Revoked API key: ${id}`);
  }

  /**
   * Validate an API key and return its context.
   * Used by the collector to authenticate SDK requests.
   */
  async validateKey(key: string): Promise<{
    tenantId: string;
    projectId: string | null;
    keyId: string;
  } | null> {
    const keyHash = crypto.createHash('sha256').update(key).digest('hex');
    const apiKey = await this.apiKeyRepository.findByHash(keyHash);

    if (!apiKey || !apiKey.isActive) {
      return null;
    }

    // Check expiry
    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
      return null;
    }

    // Update last used
    await this.apiKeyRepository.updateLastUsed(apiKey.id);

    return {
      tenantId: apiKey.tenantId,
      projectId: apiKey.projectId,
      keyId: apiKey.id,
    };
  }
}
