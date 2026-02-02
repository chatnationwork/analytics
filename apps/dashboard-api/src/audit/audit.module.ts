/**
 * =============================================================================
 * AUDIT MODULE
 * =============================================================================
 *
 * Provides AuditService for recording system-wide audit events (login, config,
 * chat lifecycle). Import this module where audit logging is needed.
 */

import { Module } from "@nestjs/common";
import { DatabaseModule } from "@lib/database";
import { AuditService } from "./audit.service";
import { AuditController } from "./audit.controller";

@Module({
  imports: [DatabaseModule.forFeature()],
  controllers: [AuditController],
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
