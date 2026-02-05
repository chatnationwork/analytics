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
  Req,
  UseGuards,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import type { AuthUser } from "../auth/auth.service";
import {
  TeamEntity,
  TeamMemberEntity,
  TeamRole,
  UserEntity,
  TenantMembershipEntity,
  InboxSessionEntity,
  SessionStatus,
  ResolutionEntity,
} from "@lib/database";
import { AuditService, AuditActions } from "../audit/audit.service";
import { getRequestContext, type RequestLike } from "../request-context";

const TEAMS_VIEW_ALL = "teams.view_all";
const TEAMS_VIEW_TEAM = "teams.view_team";
const TEAMS_MANAGE = "teams.manage";

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
    priority?: string[];
    sortBy?: string;
    timeWindow?: string;
    maxLoad?: number;
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
    @InjectRepository(InboxSessionEntity)
    private readonly sessionRepo: Repository<InboxSessionEntity>,
    @InjectRepository(ResolutionEntity)
    private readonly resolutionRepo: Repository<ResolutionEntity>,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Resolve which team IDs the user is allowed to view (for visibility: active chats, queued chats, workload).
   * - teams.manage or teams.view_all: all teams in the tenant.
   * - teams.view_team only: teams the user is a member of.
   * - otherwise: none.
   */
  private async getAllowedTeamIdsForView(user: AuthUser): Promise<string[]> {
    const global = user.permissions?.global ?? [];
    const canViewAll =
      global.includes(TEAMS_MANAGE) || global.includes(TEAMS_VIEW_ALL);
    const canViewTeam = global.includes(TEAMS_VIEW_TEAM);

    if (canViewAll) {
      const teams = await this.teamRepo.find({
        where: { tenantId: user.tenantId },
        select: ["id"],
      });
      return teams.map((t) => t.id);
    }
    if (canViewTeam) {
      const memberships = await this.memberRepo.find({
        where: { userId: user.id, isActive: true },
        select: ["teamId"],
      });
      return memberships.map((m) => m.teamId);
    }
    return [];
  }

  /**
   * List teams the user is allowed to view (with member counts).
   * Requires teams.manage, teams.view_all, or teams.view_team.
   */
  @Get()
  async listTeams(@Request() req: { user: AuthUser }) {
    const allowedIds = await this.getAllowedTeamIdsForView(req.user);
    if (allowedIds.length === 0) {
      throw new ForbiddenException(
        "You do not have permission to view team management.",
      );
    }

    const teams = await this.teamRepo.find({
      where: { tenantId: req.user.tenantId },
      relations: ["members"],
      order: { isDefault: "DESC", createdAt: "ASC" },
    });

    const filtered = teams.filter((t) => allowedIds.includes(t.id));

    return filtered.map((team) => ({
      ...team,
      memberCount: team.members?.filter((m) => m.isActive).length || 0,
      totalMemberCount: team.members?.length || 0,
    }));
  }

  /**
   * Get queue stats per team: queue size, active chats, agent count, wait time, resolution time.
   * Only returns stats for teams the user is allowed to view (teams.view_all or teams.view_team).
   * Must be declared before @Get(":teamId").
   */
  @Get("queue-stats")
  async getQueueStats(@Request() req: { user: AuthUser }) {
    const tenantId = req.user.tenantId;
    const allowedIds = await this.getAllowedTeamIdsForView(req.user);
    if (allowedIds.length === 0) return [];

    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const result: Array<{
      teamId: string;
      queueSize: number;
      activeChats: number;
      agentCount: number;
      avgWaitTimeMinutes: number | null;
      longestWaitTimeMinutes: number | null;
      avgResolutionTimeMinutes: number | null;
      longestResolutionTimeMinutes: number | null;
    }> = [];

    for (const teamId of allowedIds) {
      const [queueSizeRow] = await this.sessionRepo
        .createQueryBuilder("s")
        .select("COUNT(*)", "count")
        .where("s.tenantId = :tenantId", { tenantId })
        .andWhere("s.assignedTeamId = :teamId", { teamId })
        .andWhere("s.status = :status", {
          status: SessionStatus.UNASSIGNED,
        })
        .getRawMany<{ count: string }>();

      const queueSize = parseInt(queueSizeRow?.count ?? "0", 10);

      const [activeChatsRow] = await this.sessionRepo
        .createQueryBuilder("s")
        .select("COUNT(*)", "count")
        .where("s.tenantId = :tenantId", { tenantId })
        .andWhere("s.assignedTeamId = :teamId", { teamId })
        .andWhere("s.status = :status", { status: SessionStatus.ASSIGNED })
        .andWhere("s.acceptedAt IS NOT NULL")
        .getRawMany<{ count: string }>();
      const activeChats = parseInt(activeChatsRow?.count ?? "0", 10);

      const agentCountResult = await this.memberRepo.count({
        where: { teamId, isActive: true },
      });
      const agentCount = agentCountResult ?? 0;

      // Wait time = assignment to accept (only sessions that have been accepted)
      const avgWaitResult = await this.sessionRepo
        .createQueryBuilder("s")
        .select(
          "AVG(EXTRACT(EPOCH FROM (s.acceptedAt - s.assignedAt)) / 60)",
          "avgMinutes",
        )
        .where("s.tenantId = :tenantId", { tenantId })
        .andWhere("s.assignedTeamId = :teamId", { teamId })
        .andWhere("s.assignedAt IS NOT NULL")
        .andWhere("s.acceptedAt IS NOT NULL")
        .andWhere("s.acceptedAt >= :since", { since })
        .getRawOne<{ avgMinutes: string | null }>();

      const avgWaitParsed =
        avgWaitResult?.avgMinutes != null
          ? parseFloat(avgWaitResult.avgMinutes)
          : NaN;
      const avgWaitTimeMinutes = Number.isFinite(avgWaitParsed)
        ? Math.round(avgWaitParsed)
        : null;

      const longestWaitResult = await this.sessionRepo
        .createQueryBuilder("s")
        .select(
          "MAX(EXTRACT(EPOCH FROM (s.acceptedAt - s.assignedAt)) / 60)",
          "maxMinutes",
        )
        .where("s.tenantId = :tenantId", { tenantId })
        .andWhere("s.assignedTeamId = :teamId", { teamId })
        .andWhere("s.assignedAt IS NOT NULL")
        .andWhere("s.acceptedAt IS NOT NULL")
        .andWhere("s.acceptedAt >= :since", { since })
        .getRawOne<{ maxMinutes: string | null }>();

      const longestWaitParsed =
        longestWaitResult?.maxMinutes != null
          ? parseFloat(longestWaitResult.maxMinutes)
          : NaN;
      const longestWaitTimeMinutes = Number.isFinite(longestWaitParsed)
        ? Math.round(longestWaitParsed)
        : null;

      // Resolution time = accept to resolved (resolutions joined with sessions that have acceptedAt)
      const resolutionStats = await this.resolutionRepo
        .createQueryBuilder("r")
        .innerJoin("r.session", "s")
        .select(
          "AVG(EXTRACT(EPOCH FROM (r.createdAt - s.acceptedAt)) / 60)",
          "avgMinutes",
        )
        .addSelect(
          "MAX(EXTRACT(EPOCH FROM (r.createdAt - s.acceptedAt)) / 60)",
          "maxMinutes",
        )
        .where("s.tenantId = :tenantId", { tenantId })
        .andWhere("s.assignedTeamId = :teamId", { teamId })
        .andWhere("s.acceptedAt IS NOT NULL")
        .andWhere("r.createdAt >= :since", { since })
        .getRawOne<{ avgMinutes: string | null; maxMinutes: string | null }>();

      const avgResParsed =
        resolutionStats?.avgMinutes != null
          ? parseFloat(resolutionStats.avgMinutes)
          : NaN;
      const avgResolutionTimeMinutes = Number.isFinite(avgResParsed)
        ? Math.round(avgResParsed)
        : null;
      const longestResParsed =
        resolutionStats?.maxMinutes != null
          ? parseFloat(resolutionStats.maxMinutes)
          : NaN;
      const longestResolutionTimeMinutes = Number.isFinite(longestResParsed)
        ? Math.round(longestResParsed)
        : null;

      result.push({
        teamId,
        queueSize,
        activeChats,
        agentCount,
        avgWaitTimeMinutes,
        longestWaitTimeMinutes,
        avgResolutionTimeMinutes,
        longestResolutionTimeMinutes,
      });
    }

    return result;
  }

  /**
   * Get all tenant members available for team assignment.
   * Must be declared before @Get(":teamId") so "available-members" is not matched as teamId.
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
   * Get a specific team with members (including user details).
   * Users with teams.view_team only can access teams they are a member of.
   */
  @Get(":teamId")
  async getTeam(
    @Request() req: { user: AuthUser },
    @Param("teamId") teamId: string,
  ) {
    const team = await this.teamRepo.findOne({
      where: { id: teamId },
      relations: ["members", "members.user"],
    });

    if (!team) {
      throw new NotFoundException("Team not found");
    }

    if (team.tenantId !== req.user.tenantId) {
      throw new NotFoundException("Team not found");
    }

    const global = req.user.permissions?.global ?? [];
    const canViewAll =
      global.includes(TEAMS_MANAGE) || global.includes(TEAMS_VIEW_ALL);
    if (!canViewAll && global.includes(TEAMS_VIEW_TEAM)) {
      const isMember = await this.memberRepo.findOne({
        where: { teamId, userId: req.user.id, isActive: true },
      });
      if (!isMember) {
        throw new ForbiddenException(
          "You can only view teams you are a member of.",
        );
      }
    } else if (!canViewAll) {
      throw new ForbiddenException(
        "You do not have permission to view this team.",
      );
    }

    return {
      ...team,
      memberCount: team.members?.filter((m) => m.isActive).length || 0,
      totalMemberCount: team.members?.length || 0,
    };
  }

  /**
   * Create a new team
   */
  @Post()
  async createTeam(
    @Request() req: { user: { id: string; tenantId: string } },
    @Req() expressReq: RequestLike,
    @Body() dto: CreateTeamDto,
  ) {
    const team = this.teamRepo.create({
      ...dto,
      tenantId: req.user.tenantId,
      isActive: true,
      isDefault: false,
    });

    const saved = await this.teamRepo.save(team);
    await this.auditService.log({
      tenantId: req.user.tenantId,
      actorId: req.user.id,
      actorType: "user",
      action: AuditActions.CONFIG_TEAM_CREATED,
      resourceType: "team",
      resourceId: saved.id,
      details: { name: saved.name },
      requestContext: getRequestContext(expressReq),
    });
    return saved;
  }

  /**
   * Update a team
   */
  @Put(":teamId")
  async updateTeam(
    @Request() req: { user: { id: string; tenantId: string } },
    @Param("teamId") teamId: string,
    @Req() expressReq: RequestLike,
    @Body() dto: Partial<CreateTeamDto>,
  ) {
    const team = await this.teamRepo.findOne({ where: { id: teamId } });
    if (!team) {
      throw new NotFoundException("Team not found");
    }

    await this.teamRepo.update(teamId, dto);
    await this.auditService.log({
      tenantId: req.user.tenantId,
      actorId: req.user.id,
      actorType: "user",
      action: AuditActions.CONFIG_TEAM_UPDATED,
      resourceType: "team",
      resourceId: teamId,
      details: { name: team.name },
      requestContext: getRequestContext(expressReq),
    });
    return this.teamRepo.findOne({ where: { id: teamId } });
  }

  /**
   * Disable a team (soft delete)
   */
  /**
   * Set a team as the default for the tenant (used when handover has no teamId).
   */
  @Patch(":teamId/set-default")
  async setDefaultTeam(
    @Request() req: { user: { id: string; tenantId: string } },
    @Param("teamId") teamId: string,
    @Req() expressReq: RequestLike,
  ) {
    const team = await this.teamRepo.findOne({ where: { id: teamId } });
    if (!team) {
      throw new NotFoundException("Team not found");
    }
    if (team.tenantId !== req.user.tenantId) {
      throw new ForbiddenException("Access denied");
    }
    await this.teamRepo.update(
      { tenantId: req.user.tenantId },
      { isDefault: false },
    );
    await this.teamRepo.update(teamId, { isDefault: true });
    await this.auditService.log({
      tenantId: req.user.tenantId,
      actorId: req.user.id,
      actorType: "user",
      action: AuditActions.CONFIG_TEAM_UPDATED,
      resourceType: "team",
      resourceId: teamId,
      details: { name: team.name, setDefault: true },
      requestContext: getRequestContext(expressReq),
    });
    return { success: true, message: "Default team updated" };
  }

  @Patch(":teamId/disable")
  async disableTeam(
    @Request() req: { user: { id: string; tenantId: string } },
    @Param("teamId") teamId: string,
    @Req() expressReq: RequestLike,
  ) {
    const team = await this.teamRepo.findOne({ where: { id: teamId } });
    if (!team) {
      throw new NotFoundException("Team not found");
    }
    if (team.tenantId !== req.user.tenantId) {
      throw new ForbiddenException("Access denied");
    }
    if (team.isDefault) {
      throw new ForbiddenException("Cannot disable the default team");
    }

    await this.teamRepo.update(teamId, { isActive: false });
    await this.auditService.log({
      tenantId: req.user.tenantId,
      actorId: req.user.id,
      actorType: "user",
      action: AuditActions.CONFIG_TEAM_DISABLED,
      resourceType: "team",
      resourceId: teamId,
      details: { name: team.name },
      requestContext: getRequestContext(expressReq),
    });
    return { success: true, message: "Team disabled" };
  }

  /**
   * Enable a team
   */
  @Patch(":teamId/enable")
  async enableTeam(
    @Request() req: { user: { id: string; tenantId: string } },
    @Param("teamId") teamId: string,
    @Req() expressReq: RequestLike,
  ) {
    const team = await this.teamRepo.findOne({ where: { id: teamId } });
    if (!team) {
      throw new NotFoundException("Team not found");
    }
    if (team.tenantId !== req.user.tenantId) {
      throw new ForbiddenException("Access denied");
    }

    await this.teamRepo.update(teamId, { isActive: true });
    await this.auditService.log({
      tenantId: req.user.tenantId,
      actorId: req.user.id,
      actorType: "user",
      action: AuditActions.CONFIG_TEAM_ENABLED,
      resourceType: "team",
      resourceId: teamId,
      details: { name: team.name },
      requestContext: getRequestContext(expressReq),
    });
    return { success: true, message: "Team enabled" };
  }

  /**
   * Delete a team (hard delete - only for non-default teams)
   */
  @Delete(":teamId")
  async deleteTeam(
    @Request() req: { user: { id: string; tenantId: string } },
    @Param("teamId") teamId: string,
    @Req() expressReq: RequestLike,
  ) {
    const team = await this.teamRepo.findOne({ where: { id: teamId } });
    if (!team) {
      throw new NotFoundException("Team not found");
    }

    if (team.isDefault) {
      throw new ForbiddenException("Cannot delete the default team");
    }

    await this.teamRepo.delete(teamId);
    await this.auditService.log({
      tenantId: req.user.tenantId,
      actorId: req.user.id,
      actorType: "user",
      action: AuditActions.CONFIG_TEAM_DELETED,
      resourceType: "team",
      resourceId: teamId,
      details: { name: team.name },
      requestContext: getRequestContext(expressReq),
    });
    return { success: true };
  }

  /**
   * Get members of a team, including assigned chats today per member.
   */
  @Get(":teamId/members")
  async getMembers(
    @Request() req: { user: AuthUser },
    @Param("teamId") teamId: string,
  ) {
    const tenantId = req.user.tenantId;
    const team = await this.teamRepo.findOne({ where: { id: teamId } });
    if (!team) {
      throw new NotFoundException("Team not found");
    }

    const members = await this.memberRepo.find({
      where: { teamId },
      relations: ["user"],
      order: { joinedAt: "DESC" },
    });

    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);

    const assignedTodayByUser = new Map<string, number>();
    if (members.length > 0) {
      const userIds = members.map((m) => m.userId);
      const rows = await this.sessionRepo
        .createQueryBuilder("s")
        .select("s.assignedAgentId", "userId")
        .addSelect("COUNT(*)::int", "cnt")
        .where("s.tenantId = :tenantId", { tenantId })
        .andWhere("s.assignedAgentId IN (:...userIds)", { userIds })
        .andWhere("s.assignedAt >= :todayStart", { todayStart })
        .groupBy("s.assignedAgentId")
        .getRawMany<{ userId: string; cnt: string }>();
      rows.forEach((r) =>
        assignedTodayByUser.set(r.userId, parseInt(r.cnt ?? "0", 10)),
      );
    }

    return members.map((m) => ({
      id: m.id,
      userId: m.userId,
      name: m.user?.name || "Unknown",
      email: m.user?.email || "",
      role: m.role,
      isActive: m.isActive,
      joinedAt: m.joinedAt,
      assignedToday: assignedTodayByUser.get(m.userId) ?? 0,
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
