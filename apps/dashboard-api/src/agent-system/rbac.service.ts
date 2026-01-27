import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RolePermissionEntity, Permission, TeamRole } from '@lib/database';

@Injectable()
export class RbacService implements OnModuleInit {
  private readonly logger = new Logger(RbacService.name);

  constructor(
    @InjectRepository(RolePermissionEntity)
    private readonly rolePermissionRepo: Repository<RolePermissionEntity>,
  ) {}

  async onModuleInit() {
    await this.seedDefaultPermissions();
  }

  /**
   * Seed default permissions for defined roles if they don't exist.
   */
  private async seedDefaultPermissions() {
    this.logger.log('Seeding default RBAC permissions...');
    
    // Define default permissions mapping
    // Note: We are defining both Global and Team roles here for simplicity in the permissions table.
    // The application logic will check against the correct context (Tenant vs Team).
    const defaults: Record<string, Permission[]> = {
      // --- Global Roles ---
      'super_admin': Object.values(Permission), // Full access
      'admin': [
        Permission.ANALYTICS_VIEW,
        Permission.ANALYTICS_EXPORT,
        Permission.SETTINGS_MANAGE,
        Permission.USERS_MANAGE,
        Permission.TEAMS_MANAGE,
        Permission.AUDIT_VIEW,
      ],
      'auditor': [
        Permission.ANALYTICS_VIEW,
        Permission.AUDIT_VIEW,
      ],
      'member': [], // No global permissions (Agent System only)

      // --- Team Roles ---
      [TeamRole.MANAGER]: [
        Permission.TEAM_SETTINGS,
        Permission.TEAM_ANALYTICS,
        Permission.SESSION_VIEW,
        Permission.SESSION_MANAGE,
        Permission.AGENT_ASSIGN,
      ],
      [TeamRole.AGENT]: [
        Permission.SESSION_VIEW,
        Permission.SESSION_MANAGE, // Reply/Resolve
      ],
      
      // Legacy mappings (optional, for backward compat if needed)
      // [TeamRole.MEMBER]: [Permission.SESSION_VIEW, Permission.SESSION_MANAGE],
    };

    for (const [role, permissions] of Object.entries(defaults)) {
      for (const permission of permissions) {
        // Skip if permission is not in the Enum (safety check)
        if (!Object.values(Permission).includes(permission)) {
            this.logger.warn(`Skipping unknown permission: ${permission} for role ${role}`);
            continue;
        }

        const exists = await this.rolePermissionRepo.findOne({
          where: { role, permission },
        });

        if (!exists) {
            await this.rolePermissionRepo.save({
                role,
                permission,
            });
        }
      }
    }
    
    this.logger.log('RBAC permissions seeded.');
  }

  /**
   * Check if a role has a specific permission.
   * Checks database for dynamic permissions.
   */
  async hasPermission(role: string, permission: Permission): Promise<boolean> {
    const count = await this.rolePermissionRepo.count({
        where: { role, permission }
    });
    return count > 0;
  }

  /**
   * Get all permissions for a specific role.
   */
  async getPermissionsForRole(role: string): Promise<string[]> {
      const perms = await this.rolePermissionRepo.find({
          where: { role }
      });
      return perms.map(p => p.permission);
  }
}
