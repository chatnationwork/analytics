/**
 * Danger Zone Service
 * Archives entity as JSON, then deletes (or deactivates for users).
 */

import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import {
  EntityArchiveEntity,
  RoleEntity,
  TeamEntity,
  TeamMemberEntity,
  TenantMembershipEntity,
  UserEntity,
} from "@lib/database";
import { TenantRepository } from "@lib/database";
import { AuditService, AuditActions } from "../audit/audit.service";
import { getRequestContext, type RequestLike } from "../request-context";
@Injectable()
export class DangerZoneService {
  constructor(
    @InjectRepository(EntityArchiveEntity)
    private readonly archiveRepo: Repository<EntityArchiveEntity>,
    @InjectRepository(RoleEntity)
    private readonly roleRepo: Repository<RoleEntity>,
    @InjectRepository(TeamEntity)
    private readonly teamRepo: Repository<TeamEntity>,
    @InjectRepository(TeamMemberEntity)
    private readonly memberRepo: Repository<TeamMemberEntity>,
    @InjectRepository(TenantMembershipEntity)
    private readonly membershipRepo: Repository<TenantMembershipEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    private readonly tenantRepository: TenantRepository,
    private readonly auditService: AuditService,
  ) {}

  async archiveAndDeleteRole(
    roleId: string,
    tenantId: string,
    actorId: string,
    requestContext?: RequestLike,
  ): Promise<{ success: boolean }> {
    const role = await this.roleRepo.findOne({ where: { id: roleId } });
    if (!role) throw new NotFoundException("Role not found");

    if (role.isSystem) {
      throw new ForbiddenException(
        "Cannot delete system roles. Edit them to create an override.",
      );
    }
    if (role.tenantId !== tenantId) {
      throw new ForbiddenException("Access denied");
    }

    const data: Record<string, unknown> = {
      id: role.id,
      name: role.name,
      description: role.description,
      permissions: role.permissions,
      tenantId: role.tenantId,
      isSystem: role.isSystem,
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
    };

    await this.archiveRepo.save(
      this.archiveRepo.create({
        entityType: "role",
        entityId: roleId,
        tenantId,
        archivedBy: actorId,
        data,
      }),
    );

    const systemRole = await this.roleRepo.findOne({
      where: { name: role.name, isSystem: true },
    });
    if (systemRole) {
      await this.membershipRepo.update(
        { tenantId, roleId: role.id },
        { roleId: systemRole.id },
      );
    }

    await this.roleRepo.remove(role);

    await this.auditService.log({
      tenantId,
      actorId,
      actorType: "user",
      action: "danger_zone.role.deleted",
      resourceType: "role",
      resourceId: roleId,
      details: { name: role.name },
      requestContext: requestContext
        ? getRequestContext(requestContext)
        : undefined,
    });

    return { success: true };
  }

  async archiveAndDeleteTeam(
    teamId: string,
    tenantId: string,
    actorId: string,
    requestContext?: RequestLike,
  ): Promise<{ success: boolean }> {
    const team = await this.teamRepo.findOne({
      where: { id: teamId },
      relations: ["members", "members.user"],
    });
    if (!team) throw new NotFoundException("Team not found");

    if (team.tenantId !== tenantId) {
      throw new ForbiddenException("Access denied");
    }
    if (team.isDefault) {
      throw new ForbiddenException("Cannot delete the default team");
    }

    const members = team.members ?? [];
    const membersData = members.map((m) => ({
      id: m.id,
      userId: m.userId,
      role: m.role,
      isActive: m.isActive,
      joinedAt: m.joinedAt,
      userName: m.user?.name,
      userEmail: m.user?.email,
    }));

    const data: Record<string, unknown> = {
      team: {
        id: team.id,
        name: team.name,
        description: team.description,
        routingStrategy: team.routingStrategy,
        schedule: team.schedule,
        routingConfig: team.routingConfig,
        wrapUpReport: team.wrapUpReport,
        isActive: team.isActive,
        isDefault: team.isDefault,
        tenantId: team.tenantId,
        createdAt: team.createdAt,
        updatedAt: team.updatedAt,
      },
      members: membersData,
    };

    await this.archiveRepo.save(
      this.archiveRepo.create({
        entityType: "team",
        entityId: teamId,
        tenantId,
        archivedBy: actorId,
        data,
      }),
    );

    await this.teamRepo.delete(teamId);

    await this.auditService.log({
      tenantId,
      actorId,
      actorType: "user",
      action: AuditActions.CONFIG_TEAM_DELETED,
      resourceType: "team",
      resourceId: teamId,
      details: { name: team.name },
      requestContext: requestContext
        ? getRequestContext(requestContext)
        : undefined,
    });

    return { success: true };
  }

  async archiveAndDeactivateUser(
    targetUserId: string,
    tenantId: string,
    actorId: string,
    requestContext?: RequestLike,
  ): Promise<{ success: boolean }> {
    if (targetUserId === actorId) {
      throw new BadRequestException("You cannot delete yourself");
    }

    const membership = await this.tenantRepository.getMembership(
      tenantId,
      targetUserId,
    );
    if (!membership) throw new NotFoundException("Member not found");

    const superAdminCount = await this.tenantRepository.countMembersWithRole(
      tenantId,
      "super_admin",
    );
    if (membership.role === "super_admin" && superAdminCount <= 1) {
      throw new BadRequestException(
        "Cannot deactivate the last super admin",
      );
    }

    const user = membership.user;
    const data: Record<string, unknown> = {
      user: user
        ? {
            id: user.id,
            email: user.email,
            name: user.name,
            emailVerified: user.emailVerified,
            avatarUrl: user.avatarUrl,
            createdAt: user.createdAt,
            lastLoginAt: user.lastLoginAt,
          }
        : null,
      membership: {
        userId: membership.userId,
        tenantId: membership.tenantId,
        role: membership.role,
        joinedAt: membership.joinedAt,
        isActive: membership.isActive,
        invitedBy: membership.invitedBy,
        roleId: membership.roleId,
      },
    };

    await this.archiveRepo.save(
      this.archiveRepo.create({
        entityType: "user",
        entityId: targetUserId,
        tenantId,
        archivedBy: actorId,
        data,
      }),
    );

    await this.tenantRepository.setMemberActive(tenantId, targetUserId, false);

    await this.auditService.log({
      tenantId,
      actorId,
      actorType: "user",
      action: "danger_zone.user.deactivated",
      resourceType: "user",
      resourceId: targetUserId,
      details: {
        email: user?.email,
        name: user?.name,
      },
      requestContext: requestContext
        ? getRequestContext(requestContext)
        : undefined,
    });

    return { success: true };
  }
}
