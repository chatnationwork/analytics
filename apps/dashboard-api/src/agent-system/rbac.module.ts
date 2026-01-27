import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RolePermissionEntity } from '@lib/database';
import { RbacService } from './rbac.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([RolePermissionEntity]),
  ],
  providers: [RbacService],
  exports: [RbacService],
})
export class RbacModule {}
