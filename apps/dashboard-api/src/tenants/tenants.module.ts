/**
 * =============================================================================
 * TENANTS MODULE
 * =============================================================================
 */

import { Module } from '@nestjs/common';
import { TenantsController } from './tenants.controller';
import { TenantContextService } from './tenant-context.service';
import { DatabaseModule } from '@lib/database';
import { InvitationsController, PublicInvitationsController } from './invitations.controller';
import { InvitationsService } from './invitations.service';

@Module({
  imports: [DatabaseModule.forFeature()],
  controllers: [TenantsController, InvitationsController, PublicInvitationsController],
  providers: [TenantContextService, InvitationsService],
  exports: [TenantContextService],
})
export class TenantsModule {}
