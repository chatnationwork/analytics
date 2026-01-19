/**
 * =============================================================================
 * CRM INTEGRATIONS CONTROLLER
 * =============================================================================
 * 
 * REST API endpoints for managing CRM integrations.
 * All routes require authentication.
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
} from '@nestjs/common';
import { JwtAuthGuard, CurrentUser, AuthUser } from '../auth';
import { TenantContextService } from '../tenants';
import { CrmIntegrationsService } from './crm-integrations.service';
import {
  CreateCrmIntegrationDto,
  UpdateCrmIntegrationDto,
  CrmIntegrationResponseDto,
  TestConnectionResponseDto,
} from './dto';

@Controller('crm-integrations')
@UseGuards(JwtAuthGuard)
export class CrmIntegrationsController {
  constructor(
    private readonly crmIntegrationsService: CrmIntegrationsService,
    private readonly tenantContextService: TenantContextService,
  ) {}

  /**
   * List all CRM integrations for the current tenant.
   */
  @Get()
  async list(@CurrentUser() user: AuthUser): Promise<CrmIntegrationResponseDto[]> {
    const context = await this.tenantContextService.getTenantForUser(user.id);
    return this.crmIntegrationsService.listIntegrations(context.tenantId);
  }

  /**
   * Get a single CRM integration.
   */
  @Get(':id')
  async getOne(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<CrmIntegrationResponseDto> {
    const context = await this.tenantContextService.getTenantForUser(user.id);
    return this.crmIntegrationsService.getIntegration(id, context.tenantId);
  }

  /**
   * Create a new CRM integration.
   */
  @Post()
  async create(
    @Body() dto: CreateCrmIntegrationDto,
    @CurrentUser() user: AuthUser,
  ): Promise<CrmIntegrationResponseDto> {
    const context = await this.tenantContextService.getTenantForUser(user.id);
    return this.crmIntegrationsService.createIntegration(context.tenantId, dto);
  }

  /**
   * Update a CRM integration.
   */
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateCrmIntegrationDto,
    @CurrentUser() user: AuthUser,
  ): Promise<CrmIntegrationResponseDto> {
    const context = await this.tenantContextService.getTenantForUser(user.id);
    return this.crmIntegrationsService.updateIntegration(id, context.tenantId, dto);
  }

  /**
   * Delete a CRM integration.
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<void> {
    const context = await this.tenantContextService.getTenantForUser(user.id);
    return this.crmIntegrationsService.deleteIntegration(id, context.tenantId);
  }

  /**
   * Test connection for a CRM integration.
   */
  @Get(':id/test')
  async testConnection(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<TestConnectionResponseDto> {
    const context = await this.tenantContextService.getTenantForUser(user.id);
    return this.crmIntegrationsService.testConnection(id, context.tenantId);
  }
}
