import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  UnauthorizedException,
  Request,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import {
  IsString,
  IsOptional,
  IsArray,
  IsNotEmpty,
  MinLength,
} from "class-validator";
import { RoleEntity, Permission, TenantMembershipEntity } from "@lib/database";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RbacService } from "./rbac.service";

class CreateRoleDto {
  @IsString()
  @IsNotEmpty({ message: "Name is required" })
  @MinLength(1, { message: "Name is required" })
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsArray()
  @IsString({ each: true })
  permissions: string[];
}

class UpdateRoleDto {
  @IsOptional()
  @IsString()
  @MinLength(1, { message: "Name cannot be empty" })
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissions?: string[];
}

@Controller("settings/roles")
@UseGuards(JwtAuthGuard)
export class RoleController {
  constructor(
    @InjectRepository(RoleEntity)
    private readonly roleRepo: Repository<RoleEntity>,
    @InjectRepository(TenantMembershipEntity)
    private readonly memberRepo: Repository<TenantMembershipEntity>,
    private readonly rbacService: RbacService,
  ) {}

  /**
   * Helper to check if user is a Super Admin or Admin of the tenant.
   * For this endpoint, we assume the user is managing their CURRENT tenant's roles.
   * The tenantId comes from the session/user context.
   * But `req.user` usually has `userId`. We need to know WHICH tenant context they are in.
   * Typically done via headers or a "current tenant" logic.
   * For now, we'll fetch the user's membership for the requested tenant?
   * Or assume the user context includes `currentTenantId`.
   * MVP: We check global roles (Super Admin) OR assume user is editing own tenant roles.
   * However, `RoleEntity` has `tenantId`.
   * For simplicity, let's allow users to manage roles for a `tenantId` passed in body or header.
   * OR standard pattern: `req.user.tenantId`.
   * But `JwtStrategy` might not popualte `tenantId`.
   * Let's look up membership using `req.user.id`.
   */
  private async checkAdminAccess(userId: string, tenantId: string) {
    // Check if user is Admin/SuperAdmin/Owner in this tenant
    const membership = await this.memberRepo.findOne({
      where: { userId, tenantId },
      relations: ["user"], // load user if needed
    });

    if (!membership)
      throw new ForbiddenException("Not a member of this tenant");

    // Standard string roles check (legacy) OR check role permissions
    const legacyAdmin = ["owner", "super_admin", "admin"].includes(
      membership.role,
    );

    const permCheck = await this.rbacService.hasPermission(
      membership.role,
      Permission.SETTINGS_MANAGE,
      tenantId,
    );

    if (!legacyAdmin && !permCheck) {
      throw new ForbiddenException("Insufficient permissions");
    }
  }

  /**
   * GET /settings/roles/permissions
   * Returns the list of all available permission strings.
   * Must be declared before @Get(':id') to avoid 'permissions' being matched as :id.
   */
  @Get("permissions")
  async listPermissions() {
    return Object.values(Permission);
  }

  @Get()
  async listRoles(@Request() req: any) {
    const tenantId = req.headers["x-tenant-id"] as string;

    // Fetch generic system roles
    const systemRoles = await this.roleRepo.find({
      where: { isSystem: true },
      order: { name: "ASC" },
    });

    if (!tenantId) {
      return systemRoles;
    }

    // Fetch tenant-specific roles
    const tenantRoles = await this.roleRepo.find({
      where: { tenantId },
      order: { name: "ASC" },
    });

    // Merge: Tenant roles override system roles with same name
    const roleMap = new Map<string, RoleEntity>();

    systemRoles.forEach((r) => roleMap.set(r.name, r));
    tenantRoles.forEach((r) => roleMap.set(r.name, r)); // Overwrites system role if name matches

    return Array.from(roleMap.values()).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }

  @Post()
  async createRole(@Request() req: any, @Body() body: CreateRoleDto) {
    const tenantId = req.headers["x-tenant-id"] as string;
    if (!tenantId) throw new UnauthorizedException("Tenant context required");
    await this.checkAdminAccess(req.user.id, tenantId);

    const role = this.roleRepo.create({
      name: body.name,
      description: body.description,
      permissions: body.permissions ?? [],
      tenantId,
      isSystem: false,
    });
    return this.roleRepo.save(role);
  }

  @Put(":id")
  async updateRole(
    @Request() req: any,
    @Param("id") id: string,
    @Body() body: UpdateRoleDto,
  ) {
    const tenantId = req.headers["x-tenant-id"] as string;
    if (!tenantId) throw new UnauthorizedException("Tenant context required");
    await this.checkAdminAccess(req.user.id, tenantId);

    const role = await this.roleRepo.findOne({ where: { id } });
    if (!role) throw new NotFoundException("Role not found");

    // Scenario 1: Editing a custom tenant role
    if (role.tenantId === tenantId) {
      this.roleRepo.merge(role, body);
      return this.roleRepo.save(role);
    }

    // Scenario 2: Editing a system role (Copy-on-Write)
    if (role.isSystem) {
      // Check if we already have an override for this system role name
      // (Edge case: user tries to edit system role by ID, but they already have a custom role with that name?
      //  In the list, we return the custom one, so ID would be different.
      //  So this only happens if they are editing the foundational system role for the first time.)

      // Create override
      const newRole = this.roleRepo.create({
        name: role.name, // Keep name to maintain "override" status
        description: body.description || role.description,
        permissions: body.permissions || role.permissions,
        tenantId,
        isSystem: false,
      });

      const savedRole = await this.roleRepo.save(newRole);

      // MIGRATE: Update all members of this tenant who were pointing to the system role
      // to point to the new custom role.
      await this.memberRepo.update(
        { tenantId, roleId: role.id },
        { roleId: savedRole.id },
      );

      return savedRole;
    }

    throw new ForbiddenException("Cannot edit role from another tenant");
  }

  @Delete(":id")
  async deleteRole(@Request() req: any, @Param("id") id: string) {
    const tenantId = req.headers["x-tenant-id"] as string;
    if (!tenantId) throw new UnauthorizedException("Tenant context required");
    await this.checkAdminAccess(req.user.id, tenantId);

    const role = await this.roleRepo.findOne({ where: { id } });
    if (!role) throw new NotFoundException();

    if (role.isSystem)
      throw new ForbiddenException(
        "Cannot delete system roles. Edit them to create an override.",
      );
    if (role.tenantId !== tenantId)
      throw new ForbiddenException("Access denied");

    // If we delete an override (custom role that shares name with system role),
    // we should revert members to the system role?
    // 1. Find system role with same name
    const systemRole = await this.roleRepo.findOne({
      where: { name: role.name, isSystem: true },
    });

    if (systemRole) {
      // Revert members to system role
      await this.memberRepo.update(
        { tenantId, roleId: role.id },
        { roleId: systemRole.id },
      );
    } else {
      // Just a normal custom role deletion - members become roleless?
      // Or we block deletion if assigned?
      // Soft path: Set roleId to null (handled by onDelete: SET NULL in entity)
    }

    return this.roleRepo.remove(role);
  }
}
