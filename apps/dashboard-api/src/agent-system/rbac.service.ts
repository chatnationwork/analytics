import { Injectable, OnModuleInit, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { RoleEntity, Permission, TeamRole } from "@lib/database";

@Injectable()
export class RbacService implements OnModuleInit {
  private readonly logger = new Logger(RbacService.name);

  constructor(
    @InjectRepository(RoleEntity)
    private readonly roleRepo: Repository<RoleEntity>,
  ) {}

  async onModuleInit() {
    await this.seedDefaultPermissions();
  }

  /**
   * Seed default permissions into RoleEntity.
   */
  private async seedDefaultPermissions() {
    this.logger.log("Seeding default RBAC roles...");

    const defaults: Record<string, Permission[]> = {
      // --- Global Roles ---
      super_admin: Object.values(Permission), // Full access
      admin: [
        Permission.ANALYTICS_VIEW,
        Permission.ANALYTICS_EXPORT,
        Permission.SETTINGS_MANAGE,
        Permission.USERS_MANAGE,
        Permission.TEAMS_MANAGE,
        Permission.TEAMS_VIEW_ALL,
        Permission.AUDIT_VIEW,
      ],
      auditor: [Permission.ANALYTICS_VIEW, Permission.AUDIT_VIEW],
      member: [],

      // --- Team Roles ---
      [TeamRole.MANAGER]: [
        Permission.TEAM_SETTINGS,
        Permission.TEAM_ANALYTICS,
        Permission.TEAMS_VIEW_TEAM,
        Permission.SESSION_VIEW,
        Permission.SESSION_MANAGE,
        Permission.AGENT_ASSIGN,
      ],
      [TeamRole.AGENT]: [Permission.SESSION_VIEW, Permission.SESSION_MANAGE],
    };

    for (const [roleName, permissions] of Object.entries(defaults)) {
      const defaultPerms = permissions as string[];
      let role = await this.roleRepo.findOne({
        where: { name: roleName, isSystem: true },
      });

      if (!role) {
        // Create if missing
        this.logger.log(`Creating system role: ${roleName}`);
        role = this.roleRepo.create({
          name: roleName,
          isSystem: true,
          description: `System role: ${roleName}`,
          permissions: defaultPerms,
        });
        await this.roleRepo.save(role);
      } else {
        // Sync existing system role to code defaults so prod gets correct permissions
        // after deploy (e.g. super_admin must have analytics.view etc.)
        const existing = Array.isArray(role.permissions)
          ? role.permissions
          : [];
        const sortedExisting = [...existing].sort();
        const sortedDefaults = [...defaultPerms].sort();
        const same =
          sortedExisting.length === sortedDefaults.length &&
          sortedExisting.every((p, i) => p === sortedDefaults[i]);
        if (!same) {
          this.logger.log(`Syncing system role permissions: ${roleName}`);
          role.permissions = defaultPerms;
          await this.roleRepo.save(role);
        }
      }
    }

    this.logger.log("RBAC roles seeded.");
  }

  /**
   * Check if a role has a specific permission.
   * If tenantId is provided, checks for tenant-specific role override first.
   */
  async hasPermission(
    roleName: string,
    permission: Permission,
    tenantId?: string,
  ): Promise<boolean> {
    let role: RoleEntity | null = null;

    // 1. Try to find tenant-specific override if context provided
    if (tenantId) {
      role = await this.roleRepo.findOne({
        where: { name: roleName, tenantId },
      });
    }

    // 2. Fallback to system role
    if (!role) {
      role = await this.roleRepo.findOne({
        where: { name: roleName, isSystem: true },
      });
    }

    if (!role) {
      return false;
    }

    // 3. Check JSON array
    return role.permissions.includes(permission);
  }

  /**
   * Get all permissions for a specific role.
   */
  async getPermissionsForRole(roleName: string): Promise<string[]> {
    const role = await this.roleRepo.findOne({ where: { name: roleName } });
    if (!role) return [];
    return role.permissions;
  }

  /**
   * Helper to get Role ID by name (for strict FK usage)
   */
  async getRoleIdByName(roleName: string): Promise<string | null> {
    const role = await this.roleRepo.findOne({ where: { name: roleName } });
    return role ? role.id : null;
  }
}
