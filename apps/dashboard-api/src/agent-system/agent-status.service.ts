/**
 * Agent status viewership – list agents (online/offline), session history with metrics.
 */

import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, Between, In } from "typeorm";
import {
  AgentSessionRepository,
  AgentSessionEntity,
  AgentProfileEntity,
  InboxSessionEntity,
  ResolutionEntity,
  TeamMemberEntity,
  TeamEntity,
  UserEntity,
} from "@lib/database";
import { PresenceService } from "./presence.service";
import { ForbiddenException } from "@nestjs/common";

export interface AgentStatusItem {
  agentId: string;
  name: string | null;
  email: string;
  status: string;
  currentSessionStartedAt: Date | null;
  lastSessionEndedAt: Date | null;
}

export interface AgentSessionWithMetrics {
  id: string;
  agentId: string;
  agentName: string | null;
  startedAt: Date;
  endedAt: Date | null;
  durationMinutes: number | null;
  chatsReceived: number;
  chatsResolved: number;
  loginCount: number;
}

@Injectable()
export class AgentStatusService {
  constructor(
    private readonly agentSessionRepo: AgentSessionRepository,
    @InjectRepository(AgentProfileEntity)
    private readonly agentProfileRepo: Repository<AgentProfileEntity>,
    @InjectRepository(InboxSessionEntity)
    private readonly sessionRepo: Repository<InboxSessionEntity>,
    @InjectRepository(ResolutionEntity)
    private readonly resolutionRepo: Repository<ResolutionEntity>,
    @InjectRepository(TeamMemberEntity)
    private readonly teamMemberRepo: Repository<TeamMemberEntity>,
    @InjectRepository(TeamEntity)
    private readonly teamRepo: Repository<TeamEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    private readonly presenceService: PresenceService,
  ) {}

  /** Get all agents for tenant (team members) and their current status. */
  async getAgentStatusList(tenantId: string): Promise<AgentStatusItem[]> {
    const agentIds = await this.getAgentIdsForTenant(tenantId);
    if (agentIds.length === 0) return [];

    const [profiles, openSessions, users] = await Promise.all([
      this.agentProfileRepo.find({ where: { userId: In(agentIds) } }),
      this.agentSessionRepo.getSessionHistory(tenantId, { limit: 1000 }),
      this.userRepo.find({
        where: { id: In(agentIds) },
        select: ["id", "name", "email"],
      }),
    ]);

    const profileMap = new Map(profiles.map((p) => [p.userId, p]));
    const openMap = new Map<string, AgentSessionEntity>();
    for (const s of openSessions.data.filter((s) => !s.endedAt)) {
      if (!openMap.has(s.agentId)) openMap.set(s.agentId, s);
    }
    const lastEnded = new Map<string, Date>();
    for (const s of openSessions.data
      .filter((s) => s.endedAt)
      .sort((a, b) => b.endedAt!.getTime() - a.endedAt!.getTime())) {
      if (!lastEnded.has(s.agentId)) lastEnded.set(s.agentId, s.endedAt!);
    }
    const userMap = new Map(users.map((u) => [u.id, u]));

    return agentIds.map((agentId) => {
      const profile = profileMap.get(agentId);
      const open = openMap.get(agentId);
      const user = userMap.get(agentId);
      // Treat open agent session as online even if profile is missing or stale
      const profileStatus = profile?.status ?? "offline";
      const status =
        open != null
          ? "online"
          : typeof profileStatus === "string"
            ? profileStatus
            : "offline";
      return {
        agentId,
        name: user?.name ?? null,
        email: user?.email ?? "",
        status,
        currentSessionStartedAt: open?.startedAt ?? null,
        lastSessionEndedAt: lastEnded.get(agentId) ?? null,
      };
    });
  }

  /** Get session history with metrics (chats received, resolved) for dashboard. */
  async getSessionHistoryWithMetrics(
    tenantId: string,
    options: {
      agentId?: string;
      startDate?: Date;
      endDate?: Date;
      page?: number;
      limit?: number;
    } = {},
  ): Promise<{
    data: AgentSessionWithMetrics[];
    total: number;
    page: number;
    limit: number;
  }> {
    const { data: sessions, total } =
      await this.agentSessionRepo.getSessionHistory(tenantId, {
        agentId: options.agentId,
        startDate: options.startDate,
        endDate: options.endDate,
        page: options.page ?? 1,
        limit: options.limit ?? 20,
      });

    const agentIds = [...new Set(sessions.map((s) => s.agentId))];
    const [users, loginCountByAgent] = await Promise.all([
      this.userRepo.find({
        where: { id: In(agentIds) },
        select: ["id", "name"],
      }),
      this.agentSessionRepo.getLoginCountByAgent(tenantId, agentIds),
    ]);
    const userMap = new Map(users.map((u) => [u.id, u]));

    const data: AgentSessionWithMetrics[] = await Promise.all(
      sessions.map(async (s) => {
        const end = s.endedAt ?? new Date();
        const durationMinutes = s.endedAt
          ? Math.round((s.endedAt.getTime() - s.startedAt.getTime()) / 60000)
          : null;

        const chatsReceived = await this.sessionRepo.count({
          where: {
            tenantId,
            assignedAgentId: s.agentId,
            assignedAt: Between(s.startedAt, end),
          },
        });

        const chatsResolved = await this.resolutionRepo.count({
          where: {
            resolvedByAgentId: s.agentId,
            createdAt: Between(s.startedAt, end),
          },
        });

        const user = userMap.get(s.agentId);
        return {
          id: s.id,
          agentId: s.agentId,
          agentName: user?.name ?? null,
          startedAt: s.startedAt,
          endedAt: s.endedAt,
          durationMinutes,
          chatsReceived,
          chatsResolved,
          loginCount: loginCountByAgent.get(s.agentId) ?? 0,
        };
      }),
    );

    return {
      data,
      total,
      page: options.page ?? 1,
      limit: options.limit ?? 20,
    };
  }

  /**
   * Get agent user IDs for a tenant, filtered to only include users with role='agent'
   * in tenant_memberships. This ensures admin, developer, and auditor users are excluded
   * from the agent status list used for queue assignments.
   */
  private async getAgentIdsForTenant(tenantId: string): Promise<string[]> {
    const teams = await this.teamRepo.find({
      where: { tenantId },
      select: ["id"],
    });
    const teamIds = teams.map((t) => t.id);
    if (teamIds.length === 0) return [];
    const members = await this.teamMemberRepo.find({
      where: { teamId: In(teamIds) },
      select: ["userId"],
    });
    const allUserIds = [...new Set(members.map((m) => m.userId))];
    if (allUserIds.length === 0) return [];

    // Filter to only users with role = 'agent' in tenant_memberships
    const agentMembers: Array<{ userId: string }> =
      await this.teamRepo.manager.query(
        `
        SELECT tm."userId"
        FROM tenant_memberships tm
        WHERE tm."tenantId" = $1
          AND tm."userId" = ANY($2)
          AND tm.role = 'agent'
        `,
        [tenantId, allUserIds],
      );
    return agentMembers.map((m) => m.userId);
  }

  /**
   * Set another agent's presence (online/offline). Caller must have permission.
   * Only allowed for users who are team members in this tenant.
   */
  async setAgentPresence(
    tenantId: string,
    targetUserId: string,
    status: "online" | "offline",
  ): Promise<void> {
    const agentIds = await this.getAgentIdsForTenant(tenantId);
    if (!agentIds.includes(targetUserId)) {
      throw new ForbiddenException(
        "Cannot set presence for a user who is not an agent in this tenant",
      );
    }
    if (status === "online") {
      await this.presenceService.goOnline(tenantId, targetUserId);
    } else {
      await this.presenceService.goOffline(tenantId, targetUserId);
    }
  }
}
