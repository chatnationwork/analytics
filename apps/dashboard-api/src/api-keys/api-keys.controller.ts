/**
 * =============================================================================
 * API KEYS CONTROLLER
 * =============================================================================
 *
 * REST API endpoints for managing API keys.
 */

import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard, CurrentUser, AuthUser } from "../auth";
import { TenantContextService } from "../tenants";
import { ApiKeysService, GeneratedApiKey } from "./api-keys.service";
import { CreateApiKeyDto } from "./dto";

@Controller("api-keys")
@UseGuards(JwtAuthGuard)
export class ApiKeysController {
  constructor(
    private readonly apiKeysService: ApiKeysService,
    private readonly tenantContextService: TenantContextService,
  ) {}

  /**
   * List all API keys for the current tenant.
   */
  @Get()
  async list(@CurrentUser() user: AuthUser) {
    const context = await this.tenantContextService.getTenantForUser(user.id);
    return this.apiKeysService.listKeys(context.tenantId);
  }

  /**
   * Generate a new API key.
   * WARNING: The full key is only returned once!
   */
  @Post()
  async create(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateApiKeyDto,
  ): Promise<GeneratedApiKey> {
    const context = await this.tenantContextService.getTenantForUser(user.id);

    return this.apiKeysService.generateKey(
      context.tenantId,
      dto.name,
      dto.type || "write",
      dto.projectId,
      user.id,
    );
  }

  /**
   * Deactivate an API key (soft disable; key stops working but record remains).
   */
  @Patch(":id/deactivate")
  async deactivate(
    @Param("id") id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<{ success: boolean }> {
    const context = await this.tenantContextService.getTenantForUser(user.id);
    await this.apiKeysService.deactivateKey(id, context.tenantId);
    return { success: true };
  }
}
