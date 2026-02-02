/**
 * =============================================================================
 * TEAM CONTROLLER
 * =============================================================================
 *
 * API endpoints for team management.
 * - List teams
 * - Create/update/disable teams
 * - Manage team members (add, disable, enable)
 */

import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Request,
  UseGuards,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import {
  TeamEntity,
  TeamMemberEntity,
  TeamRole,
  UserEntity,
  TenantMembershipEntity,
} from "@lib/database";

/**
 * DTO for creating a team
 */
interface CreateTeamDto {
  name: string;
  description?: string;
  routingStrategy?: string;
  schedule?: {
    timezone: string;
    enabled: boolean;
    outOfOfficeMessage?: string;
    days: Record<string, Array<{ start: string; end: string }>>;
  };
  routingConfig?: {
    priority: string[];
  };
  wrapUpReport?: {
    enabled: boolean;
    mandatory: boolean;
    fields?: Array<{
      id: string;
      type: "select" | "text" | "textarea";
      label: string;
      required: boolean;
      placeholder?: string;
      options?: Array<{ value: string; label: string }>;
    }>;
  } | null;
}

/**
 * DTO for adding a member to a team
 */
interface AddMemberDto {
  userId: string; // Can be UUID or Email
  role?: TeamRole;
}

/**
 * Controller for team management operations.
 */
@Controller("agent/teams")
@UseGuards(JwtAuthGuard)
export class TeamController {
  constructor(
    @InjectRepository(TeamEntity)
    private readonly teamRepo: Repository<TeamEntity>,
    @InjectRepository(TeamMemberEntity)
    private readonly memberRepo: Repository<TeamMemberEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    @InjectRepository(TenantMembershipEntity)
    private readonly tenantMembershipRepo: Repository<TenantMembershipEntity>,
  ) {}

  /**
   * List all teams for the tenant (with member counts)
   */
  @Get()
  async listTeams(@Request() req: { user: { tenantId: string } }) {
    const teams = await this.teamRepo.find({
      where: { tenantId: req.user.tenantId },
      relations: ["members"],
      order: { isDefault: "DESC", createdAt: "ASC" },
    });

    // Add member counts (only active members)
    return teams.map((team) => ({
      ...team,
      memberCount: team.members?.filter((m) => m.isActive).length || 0,
      totalMemberCount: team.members?.length || 0,
    }));
  }

  /**
   * Get a specific team with members (including user details)
   */
  @Get(":teamId")
  async getTeam(@Param("teamId") teamId: string) {
    const team = await this.teamRepo.findOne({
      where: { id: teamId },
      relations: ["members", "members.user"],
    });

    if (!team) {
      throw new NotFoundException("Team not found");
    }

    return {
      ...team,
      memberCount: team.members?.filter((m) => m.isActive).length || 0,
      totalMemberCount: team.members?.length || 0,
    };
  }

  /**
   * Get all tenant members available for team assignment
   */
  @Get("available-members/list")
  async getAvailableMembersForTeam(
    @Request() req: { user: { tenantId: string } },
  ) {
    const memberships = await this.tenantMembershipRepo.find({
      where: { tenantId: req.user.tenantId },
      relations: ["user"],
    });

    return memberships.map((m) => ({
      userId: m.userId,
      name: m.user?.name || "Unknown",
      email: m.user?.email || "",
      role: m.role,
      avatarUrl: m.user?.avatarUrl,
    }));
  }

  /**
   * Create a new team
   */
  @Post()
  async createTeam(
    @Request() req: { user: { tenantId: string } },
    @Body() dto: CreateTeamDto,
  ) {
    const team = this.teamRepo.create({
      ...dto,
      tenantId: req.user.tenantId,
      isActive: true,
      isDefault: false,
    });

    return this.teamRepo.save(team);
  }

  /**
   * Update a team
   */
  @Put(":teamId")
  async updateTeam(
    @Param("teamId") teamId: string,
    @Body() dto: Partial<CreateTeamDto>,
  ) {
    const team = await this.teamRepo.findOne({ where: { id: teamId } });
    if (!team) {
      throw new NotFoundException("Team not found");
    }

    await this.teamRepo.update(teamId, dto);
    return this.teamRepo.findOne({ where: { id: teamId } });
  }

  /**
   * Disable a team (soft delete)
   */
  @Patch(":teamId/disable")
  async disableTeam(@Param("teamId") teamId: string) {
    const team = await this.teamRepo.findOne({ where: { id: teamId } });
    if (!team) {
      throw new NotFoundException("Team not found");
    }

    if (team.isDefault) {
      throw new ForbiddenException("Cannot disable the default team");
    }

    await this.teamRepo.update(teamId, { isActive: false });
    return { success: true, message: "Team disabled" };
  }

  /**
   * Enable a team
   */
  @Patch(":teamId/enable")
  async enableTeam(@Param("teamId") teamId: string) {
    const team = await this.teamRepo.findOne({ where: { id: teamId } });
    if (!team) {
      throw new NotFoundException("Team not found");
    }

    await this.teamRepo.update(teamId, { isActive: true });
    return { success: true, message: "Team enabled" };
  }

  /**
   * Delete a team (hard delete - only for non-default teams)
   */
  @Delete(":teamId")
  async deleteTeam(@Param("teamId") teamId: string) {
    const team = await this.teamRepo.findOne({ where: { id: teamId } });
    if (!team) {
      throw new NotFoundException("Team not found");
    }

    if (team.isDefault) {
      throw new ForbiddenException("Cannot delete the default team");
    }

    await this.teamRepo.delete(teamId);
    return { success: true };
  }

  /**
   * Get members of a team
   */
  @Get(":teamId/members")
  async getMembers(@Param("teamId") teamId: string) {
    const team = await this.teamRepo.findOne({ where: { id: teamId } });
    if (!team) {
      throw new NotFoundException("Team not found");
    }

    const members = await this.memberRepo.find({
      where: { teamId },
      relations: ["user"],
      order: { joinedAt: "DESC" },
    });

    return members.map((m) => ({
      id: m.id,
      userId: m.userId,
      name: m.user?.name || "Unknown",
      email: m.user?.email || "",
      role: m.role,
      isActive: m.isActive,
      joinedAt: m.joinedAt,
    }));
  }

  /**
   * Add a member to a team
   */
  @Post(":teamId/members")
  async addMember(@Param("teamId") teamId: string, @Body() dto: AddMemberDto) {
    const team = await this.teamRepo.findOne({ where: { id: teamId } });
    if (!team) {
      throw new NotFoundException("Team not found");
    }

    let targetUserId = dto.userId;

    // Check if input is email (simple regex or includes @)
    if (targetUserId.includes("@")) {
      const user = await this.userRepo.findOne({
        where: { email: targetUserId },
      });
      if (!user) {
        throw new NotFoundException(
          `User with email ${targetUserId} not found. Please invite them first from Settings > Team.`,
        );
      }
      targetUserId = user.id;
    }

    // Check if already a member (including disabled)
    const existing = await this.memberRepo.findOne({
      where: { teamId, userId: targetUserId },
    });

    if (existing) {
      // If member exists but is disabled, re-enable them
      if (!existing.isActive) {
        await this.memberRepo.update(existing.id, {
          isActive: true,
          role: dto.role || existing.role,
        });
        return this.memberRepo.findOne({
          where: { id: existing.id },
          relations: ["user"],
        });
      }
      throw new BadRequestException(
        "User is already an active member of this team",
      );
    }

    const member = this.memberRepo.create({
      teamId,
      userId: targetUserId,
      role: dto.role || TeamRole.AGENT,
      isActive: true,
    });

    const saved = await this.memberRepo.save(member);
    return this.memberRepo.findOne({
      where: { id: saved.id },
      relations: ["user"],
    });
  }

  /**
   * Disable a member from a team (soft remove)
   */
  @Patch(":teamId/members/:userId/disable")
  async disableMember(
    @Param("teamId") teamId: string,
    @Param("userId") userId: string,
  ) {
    const member = await this.memberRepo.findOne({ where: { teamId, userId } });
    if (!member) {
      throw new NotFoundException("Member not found in this team");
    }

    await this.memberRepo.update(member.id, { isActive: false });
    return { success: true, message: "Member disabled from team" };
  }

  /**
   * Enable a member in a team
   */
  @Patch(":teamId/members/:userId/enable")
  async enableMember(
    @Param("teamId") teamId: string,
    @Param("userId") userId: string,
  ) {
    const member = await this.memberRepo.findOne({ where: { teamId, userId } });
    if (!member) {
      throw new NotFoundException("Member not found in this team");
    }

    await this.memberRepo.update(member.id, { isActive: true });
    return { success: true, message: "Member enabled in team" };
  }

  /**
   * Remove a member from a team (hard delete - use disable instead for most cases)
   */
  @Delete(":teamId/members/:userId")
  async removeMember(
    @Param("teamId") teamId: string,
    @Param("userId") userId: string,
  ) {
    const member = await this.memberRepo.findOne({ where: { teamId, userId } });
    if (!member) {
      throw new NotFoundException("Member not found in this team");
    }

    await this.memberRepo.delete({ teamId, userId });
    return { success: true };
  }

  /**
   * Update a member's role
   */
  @Put(":teamId/members/:userId")
  async updateMemberRole(
    @Param("teamId") teamId: string,
    @Param("userId") userId: string,
    @Body() dto: { role: TeamRole },
  ) {
    const member = await this.memberRepo.findOne({ where: { teamId, userId } });
    if (!member) {
      throw new NotFoundException("Member not found in this team");
    }

    await this.memberRepo.update({ teamId, userId }, { role: dto.role });
    return this.memberRepo.findOne({
      where: { teamId, userId },
      relations: ["user"],
    });
  }
}
