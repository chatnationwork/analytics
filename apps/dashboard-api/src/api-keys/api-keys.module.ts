/**
 * =============================================================================
 * API KEYS MODULE
 * =============================================================================
 */

import { Module } from '@nestjs/common';
import { ApiKeysController } from './api-keys.controller';
import { ApiKeysService } from './api-keys.service';
import { TenantsModule } from '../tenants';
import { DatabaseModule } from '@lib/database';

@Module({
  imports: [DatabaseModule.forFeature(), TenantsModule],
  controllers: [ApiKeysController],
  providers: [ApiKeysService],
  exports: [ApiKeysService],
})
export class ApiKeysModule {}
