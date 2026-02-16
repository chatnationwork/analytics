/**
 * =============================================================================
 * API KEYS MODULE
 * =============================================================================
 *
 * Registers both the admin API key controller (developer-facing, secured by
 * ADMIN_API_SECRET) and the API keys service. The old user-facing controller
 * has been removed — API key management is now developer-only.
 */

import { Module } from '@nestjs/common';
import { AdminApiKeysController } from './admin-api-keys.controller';
import { ApiKeysService } from './api-keys.service';
import { TenantsModule } from '../tenants';
import { DatabaseModule } from '@lib/database';

@Module({
  imports: [DatabaseModule.forFeature(), TenantsModule],
  controllers: [AdminApiKeysController],
  providers: [ApiKeysService],
  exports: [ApiKeysService],
})
export class ApiKeysModule {}
