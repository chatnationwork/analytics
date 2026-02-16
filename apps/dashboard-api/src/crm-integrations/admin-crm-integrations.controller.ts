/**
 * =============================================================================
 * ADMIN CRM INTEGRATIONS CONTROLLER
 * =============================================================================
 *
 * Developer-only REST endpoints for managing CRM integrations.
 * Secured by AdminSecretGuard (ADMIN_API_SECRET env var) instead of JWT.
 * Auto-resolves the single tenant from the database — no tenantId needed.
 *
 * This controller runs alongside the existing JWT-guarded dashboard controller,
 * so CRM management is available both via admin API and via dashboard UI.
 */

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { AdminSecretGuard } from '../auth/admin-secret.guard';
import { CrmIntegrationsService } from './crm-integrations.service';
import {
  CreateCrmIntegrationDto,
  UpdateCrmIntegrationDto,
  CrmIntegrationResponseDto,
  TestConnectionResponseDto,
} from './dto';
import { TenantRepository } from '@lib/database';

@Controller('admin/crm-integrations')
@UseGuards(AdminSecretGuard)
export class AdminCrmIntegrationsController {
  private readonly logger = new Logger(AdminCrmIntegrationsController.name);

  constructor(
    private readonly crmIntegrationsService: CrmIntegrationsService,
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
   * List all CRM integrations for the single tenant.
   */
  @Get()
  async list(): Promise<CrmIntegrationResponseDto[]> {
    const tenantId = await this.resolveTenantId();
    return this.crmIntegrationsService.listIntegrations(tenantId);
  }

  /**
   * Get a single CRM integration by ID.
   */
  @Get(':id')
  async getOne(@Param('id') id: string): Promise<CrmIntegrationResponseDto> {
    const tenantId = await this.resolveTenantId();
    return this.crmIntegrationsService.getIntegration(id, tenantId);
  }

  /**
   * Create a new CRM integration.
   */
  @Post()
  async create(
    @Body() dto: CreateCrmIntegrationDto,
  ): Promise<CrmIntegrationResponseDto> {
    const tenantId = await this.resolveTenantId();
    this.logger.log(`Admin creating CRM integration: "${dto.name}"`);
    return this.crmIntegrationsService.createIntegration(tenantId, dto);
  }

  /**
   * Update an existing CRM integration.
   */
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateCrmIntegrationDto,
  ): Promise<CrmIntegrationResponseDto> {
    const tenantId = await this.resolveTenantId();
    this.logger.log(`Admin updating CRM integration: ${id}`);
    return this.crmIntegrationsService.updateIntegration(id, tenantId, dto);
  }

  /**
   * Delete a CRM integration.
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string): Promise<void> {
    const tenantId = await this.resolveTenantId();
    this.logger.log(`Admin deleting CRM integration: ${id}`);
    return this.crmIntegrationsService.deleteIntegration(id, tenantId);
  }

  /**
   * Test connection for a CRM integration.
   */
  @Get(':id/test')
  async testConnection(
    @Param('id') id: string,
  ): Promise<TestConnectionResponseDto> {
    const tenantId = await this.resolveTenantId();
    this.logger.log(`Admin testing CRM connection: ${id}`);
    return this.crmIntegrationsService.testConnection(id, tenantId);
  }
}
