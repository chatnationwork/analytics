/**
 * =============================================================================
 * CRM INTEGRATIONS MODULE
 * =============================================================================
 * 
 * NestJS module for CRM integration management.
 */

import { Module } from '@nestjs/common';
import { CrmIntegrationsController } from './crm-integrations.controller';
import { CrmIntegrationsService } from './crm-integrations.service';
import { CryptoService } from './crypto.service';
import { DatabaseModule } from '@lib/database';
import { TenantsModule } from '../tenants/tenants.module';

@Module({
  imports: [DatabaseModule.forFeature(), TenantsModule],
  controllers: [CrmIntegrationsController],
  providers: [CrmIntegrationsService, CryptoService],
  exports: [CrmIntegrationsService],
})
export class CrmIntegrationsModule {}
