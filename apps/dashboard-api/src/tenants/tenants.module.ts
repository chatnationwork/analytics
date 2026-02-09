/**
 * =============================================================================
 * TENANTS MODULE
 * =============================================================================
 */

import { Module } from "@nestjs/common";
import { TenantsController } from "./tenants.controller";
import { TenantContextService } from "./tenant-context.service";
import { DatabaseModule } from "@lib/database";
import { InvitationsController, PublicInvitationsController } from "./invitations.controller";
import { InvitationsService } from "./invitations.service";
import { SystemMessagesModule } from "../system-messages/system-messages.module";

@Module({
  imports: [DatabaseModule.forFeature(), SystemMessagesModule],
  controllers: [TenantsController, InvitationsController, PublicInvitationsController],
  providers: [TenantContextService, InvitationsService],
  exports: [TenantContextService],
})
export class TenantsModule {}
