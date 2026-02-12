import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import {
  EntityArchiveEntity,
  RoleEntity,
  TeamEntity,
  TeamMemberEntity,
  TenantMembershipEntity,
  UserEntity,
  DatabaseModule,
} from "@lib/database";
import { DangerZoneController } from "./danger-zone.controller";
import { DangerZoneService } from "./danger-zone.service";
import { AuditModule } from "../audit/audit.module";

@Module({
  imports: [
    DatabaseModule.forFeature(),
    AuditModule,
    TypeOrmModule.forFeature([
      EntityArchiveEntity,
      RoleEntity,
      TeamEntity,
      TeamMemberEntity,
      TenantMembershipEntity,
      UserEntity,
    ]),
  ],
  controllers: [DangerZoneController],
  providers: [DangerZoneService],
})
export class DangerZoneModule {}
