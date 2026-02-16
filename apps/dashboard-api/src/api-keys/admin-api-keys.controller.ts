/**
 * =============================================================================
 * ADMIN API KEYS CONTROLLER
 * =============================================================================
 *
 * Developer-only REST endpoints for managing API keys.
 * Secured by AdminSecretGuard (ADMIN_API_SECRET env var) instead of JWT.
 * Auto-resolves the single tenant from the database — no tenantId needed
 * in requests since the app runs as a single-tenant deployment.
 */

import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { AdminSecretGuard } from '../auth/admin-secret.guard';
import { ApiKeysService, GeneratedApiKey } from './api-keys.service';
import { CreateAdminApiKeyDto } from './dto/create-admin-api-key.dto';
import { TenantRepository } from '@lib/database';

@Controller('admin/api-keys')
@UseGuards(AdminSecretGuard)
export class AdminApiKeysController {
  private readonly logger = new Logger(AdminApiKeysController.name);

  constructor(
    private readonly apiKeysService: ApiKeysService,
    private readonly tenantRepository: TenantRepository,
  ) {}

  /**
   * Resolves the single tenant from the database.
   * Throws if no tenant exists — the app must be bootstrapped first.
   */
  private async resolveTenantId(): Promise<string> {
    const tenant = await this.tenantRepository.findSingleTenant();
    return tenant.id;
  }

  /**
   * Generate a new API key for the single tenant.
   * The full key is only returned once — store it securely!
   */
  @Post()
  async create(@Body() dto: CreateAdminApiKeyDto): Promise<GeneratedApiKey> {
    const tenantId = await this.resolveTenantId();

    this.logger.log(`Admin generating ${dto.type || 'write'} key: "${dto.name}"`);

    return this.apiKeysService.generateKey(
      tenantId,
      dto.name,
      dto.type || 'write',
      dto.projectId,
      'admin', // createdBy — marks this as admin-generated
    );
  }

  /**
   * List all API keys for the single tenant.
   * Returns key metadata only — never the actual key values.
   */
  @Get()
  async list() {
    const tenantId = await this.resolveTenantId();
    return this.apiKeysService.listKeys(tenantId);
  }

  /**
   * Revoke (deactivate) an API key.
   * The key stops working immediately but the record is preserved.
   */
  @Patch(':id/revoke')
  async revoke(@Param('id') id: string): Promise<{ success: boolean }> {
    const tenantId = await this.resolveTenantId();

    this.logger.log(`Admin revoking key: ${id}`);
    await this.apiKeysService.deactivateKey(id, tenantId);

    return { success: true };
  }
}
