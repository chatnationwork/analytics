/**
 * =============================================================================
 * CRM INTEGRATIONS SERVICE
 * =============================================================================
 * 
 * Business logic for CRM integration management.
 * Handles CRUD operations and connection testing.
 */

import {
  Injectable,
  NotFoundException,
  Logger,
  ForbiddenException,
} from '@nestjs/common';
import { CrmIntegrationRepository, TenantRepository } from '@lib/database';
import { CrmApi } from '@lib/crm-api';
import { CryptoService } from './crypto.service';
import {
  CreateCrmIntegrationDto,
  UpdateCrmIntegrationDto,
  CrmIntegrationResponseDto,
  TestConnectionResponseDto,
} from './dto';

@Injectable()
export class CrmIntegrationsService {
  private readonly logger = new Logger(CrmIntegrationsService.name);

  constructor(
    private readonly crmIntegrationRepository: CrmIntegrationRepository,
    private readonly tenantRepository: TenantRepository,
    private readonly cryptoService: CryptoService,
  ) {}

  /**
   * List all CRM integrations for a tenant.
   */
  async listIntegrations(tenantId: string): Promise<CrmIntegrationResponseDto[]> {
    const integrations = await this.crmIntegrationRepository.findByTenantId(tenantId);
    return integrations.map(this.toResponseDto);
  }

  /**
   * Get a single integration by ID.
   */
  async getIntegration(
    id: string,
    tenantId: string,
  ): Promise<CrmIntegrationResponseDto> {
    const integration = await this.crmIntegrationRepository.findById(id);
    
    if (!integration) {
      throw new NotFoundException('CRM integration not found');
    }

    if (integration.tenantId !== tenantId) {
      throw new ForbiddenException('Access denied');
    }

    return this.toResponseDto(integration);
  }

  /**
   * Create a new CRM integration.
   */
  async createIntegration(
    tenantId: string,
    dto: CreateCrmIntegrationDto,
  ): Promise<CrmIntegrationResponseDto> {
    // Encrypt the API key before storing
    const apiKeyEncrypted = this.cryptoService.encrypt(dto.apiKey);

    const integration = await this.crmIntegrationRepository.create({
      tenantId,
      name: dto.name,
      apiUrl: dto.apiUrl.trim().replace(/\/$/, ''), // Remove trailing slash and whitespace
      apiKeyEncrypted,
      isActive: true,
      config: dto.config || null,
    });

    this.logger.log(`Created CRM integration: ${integration.id} for tenant ${tenantId}`);

    return this.toResponseDto(integration);
  }

  /**
   * Update an existing integration.
   */
  async updateIntegration(
    id: string,
    tenantId: string,
    dto: UpdateCrmIntegrationDto,
  ): Promise<CrmIntegrationResponseDto> {
    const existing = await this.crmIntegrationRepository.findById(id);
    
    if (!existing) {
      throw new NotFoundException('CRM integration not found');
    }

    if (existing.tenantId !== tenantId) {
      throw new ForbiddenException('Access denied');
    }

    const updateData: Record<string, unknown> = {};
    
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.apiUrl !== undefined) updateData.apiUrl = dto.apiUrl.trim().replace(/\/$/, '');
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;
    if (dto.config !== undefined) updateData.config = dto.config;
    
    // Re-encrypt if API key is being updated
    if (dto.apiKey !== undefined) {
      updateData.apiKeyEncrypted = this.cryptoService.encrypt(dto.apiKey);
    }

    const updated = await this.crmIntegrationRepository.update(id, updateData);
    
    this.logger.log(`Updated CRM integration: ${id}`);

    return this.toResponseDto(updated!);
  }

  /**
   * Delete an integration.
   */
  async deleteIntegration(id: string, tenantId: string): Promise<void> {
    const existing = await this.crmIntegrationRepository.findById(id);
    
    if (!existing) {
      throw new NotFoundException('CRM integration not found');
    }

    if (existing.tenantId !== tenantId) {
      throw new ForbiddenException('Access denied');
    }

    await this.crmIntegrationRepository.delete(id);
    
    this.logger.log(`Deleted CRM integration: ${id}`);
  }

  /**
   * Test connection to a CRM.
   */
  async testConnection(
    id: string,
    tenantId: string,
  ): Promise<TestConnectionResponseDto> {
    const integration = await this.crmIntegrationRepository.findById(id);
    
    if (!integration) {
      throw new NotFoundException('CRM integration not found');
    }

    if (integration.tenantId !== tenantId) {
      throw new ForbiddenException('Access denied');
    }

    try {
      // Decrypt the API key
      const apiKey = this.cryptoService.decrypt(integration.apiKeyEncrypted);

      // Create CRM client and test connection
      const client = new CrmApi({
        baseUrl: integration.apiUrl,
        apiKey,
        timeout: 10000,
      });

      // Try to list contacts as a connection test
      const result = await client.listContacts({ page: 1, limit: 1 });

      // Mark as connected
      await this.crmIntegrationRepository.markConnected(id);

      return {
        success: true,
        message: 'Connection successful',
        contactCount: result.success ? result.pagination?.total : undefined,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Record the error
      await this.crmIntegrationRepository.markError(id, errorMessage);

      return {
        success: false,
        message: `Connection failed: ${errorMessage}`,
      };
    }
  }

  /**
   * Get a configured CRM client for a tenant.
   * Used by other services to make CRM API calls.
   */
  async getClientForTenant(tenantId: string, integrationId?: string): Promise<CrmApi | null> {
    let integration;
    
    if (integrationId) {
      integration = await this.crmIntegrationRepository.findById(integrationId);
      if (integration?.tenantId !== tenantId) {
        throw new ForbiddenException('Access denied');
      }
    } else {
      // Get the first active integration
      const integrations = await this.crmIntegrationRepository.findActiveByTenantId(tenantId);
      integration = integrations[0];
    }

    if (!integration) {
      return null;
    }

    const apiKey = this.cryptoService.decrypt(integration.apiKeyEncrypted).trim();

    this.logger.log(`Initializing CRM client for tenant ${tenantId}`);
    this.logger.debug(`CRM Key for ${integration.name}: ${apiKey.substring(0, 5)}... (Length: ${apiKey.length})`);

    return new CrmApi({
      baseUrl: integration.apiUrl,
      apiKey,
      timeout: 30000,
    });
  }

  /**
   * Get the active CRM integration for a tenant with DECRYPTED api key.
   * INTERNAL USE ONLY.
   */
  async getActiveIntegration(tenantId: string) {
    const integrations = await this.crmIntegrationRepository.findActiveByTenantId(tenantId);
    const integration = integrations[0];

    if (!integration) {
      return null;
    }

    const apiKey = this.cryptoService.decrypt(integration.apiKeyEncrypted).trim();

    return {
      ...integration,
      apiKey, // Decrypted key
    };
  }

  /**
   * Convert entity to response DTO (hide sensitive data).
   */
  private toResponseDto(entity: {
    id: string;
    name: string;
    apiUrl: string;
    isActive: boolean;
    config: Record<string, any> | null;
    lastConnectedAt: Date | null;
    lastError: string | null;
    createdAt: Date;
  }): CrmIntegrationResponseDto {
    return {
      id: entity.id,
      name: entity.name,
      apiUrl: entity.apiUrl,
      isActive: entity.isActive,
      config: entity.config,
      lastConnectedAt: entity.lastConnectedAt?.toISOString() ?? null,
      lastError: entity.lastError,
      createdAt: entity.createdAt.toISOString(),
    };
  }
}
