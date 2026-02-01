import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RoleEntity, TenantMembershipEntity } from '@lib/database';
import { RbacService } from './rbac.service';
import { RoleController } from './role.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([RoleEntity, TenantMembershipEntity]),
  ],
  controllers: [RoleController],
  providers: [RbacService],
  exports: [RbacService],
})
export class RbacModule {}
