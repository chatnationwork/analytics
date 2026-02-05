/**
 * =============================================================================
 * AGENT ANALYTICS SERVICE
 * =============================================================================
 *
 * Business logic for agent analytics - resolutions, transfers, performance, and team metrics.
 * Provides insights into agent productivity, workload distribution, and chat handling.
 */

import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, LessThan, In } from "typeorm";
import {
  EventRepository,
  InboxSessionEntity,
  SessionStatus,
  ResolutionEntity,
  UserEntity,
} from "@lib/database";

type Granularity = "day" | "week" | "month";

@Injectable()
export class AgentInboxAnalyticsService {
  constructor(
    private readonly eventRepository: EventRepository,
    @InjectRepository(InboxSessionEntity)
    private readonly sessionRepo: Repository<InboxSessionEntity>,
    @InjectRepository(ResolutionEntity)
    private readonly resolutionRepo: Repository<ResolutionEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
  ) {}

  /**
   * Calculate start date based on granularity and periods.
   */
  private calculateStartDate(granularity: Granularity, periods: number): Date {
    const now = new Date();
    const startDate = new Date(now);

    switch (granularity) {
      case "day":
        startDate.setDate(now.getDate() - periods);
        break;
      case "week":
        startDate.setDate(now.getDate() - periods * 7);
        break;
      case "month":
        startDate.setMonth(now.getMonth() - periods);
        break;
    }

    startDate.setHours(0, 0, 0, 0);
    return startDate;
  }

  /**
   * Resolve start/end dates: use explicit startDate/endDate when both provided (ISO strings),
   * otherwise use granularity + periods.
   */
  private resolveDateRange(
    granularity: Granularity,
    periods: number,
    startDateStr?: string,
    endDateStr?: string,
  ): { startDate: Date; endDate: Date } {
    if (startDateStr && endDateStr) {
      const startDate = new Date(startDateStr);
      const endDate = new Date(endDateStr);
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
      return { startDate, endDate };
    }
    const endDate = new Date();
    const startDate = this.calculateStartDate(granularity, periods);
    return { startDate, endDate };
  }

  /** Fill resolution trend gaps so chart has one point per period (period as ISO string). */
  private fillResolutionTrendGaps(
    data: {
      period: Date | string;
      resolvedCount: number;
      activeAgents: number;
    }[],
    startDate: Date,
    endDate: Date,
    granularity: Granularity,
  ): { period: string; resolvedCount: number; activeAgents: number }[] {
    const toKey = (d: Date) => {
      const y = d.getUTCFullYear();
      const m = String(d.getUTCMonth() + 1).padStart(2, "0");
      const day = String(d.getUTCDate()).padStart(2, "0");
      if (granularity === "day") return `${y}-${m}-${day}`;
      if (granularity === "week") {
        const jan1 = new Date(Date.UTC(y, 0, 1));
        const weekNo = Math.ceil(
          (d.getTime() - jan1.getTime()) / (7 * 24 * 60 * 60 * 1000),
        );
        return `${y}-W${weekNo}`;
      }
      return `${y}-${m}`;
    };
    const map = new Map<
      string,
      { resolvedCount: number; activeAgents: number }
    >();
    for (const row of data) {
      const p =
        typeof row.period === "string" ? new Date(row.period) : row.period;
      map.set(toKey(p), {
        resolvedCount: row.resolvedCount,
        activeAgents: row.activeAgents,
      });
    }
    const out: {
      period: string;
      resolvedCount: number;
      activeAgents: number;
    }[] = [];
    const curr = new Date(startDate);
    curr.setUTCHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setUTCHours(23, 59, 59, 999);
    while (curr <= end) {
      const key = toKey(curr);
      const row = map.get(key) ?? { resolvedCount: 0, activeAgents: 0 };
      out.push({ period: curr.toISOString(), ...row });
      if (granularity === "day") curr.setUTCDate(curr.getUTCDate() + 1);
      else if (granularity === "week") curr.setUTCDate(curr.getUTCDate() + 7);
      else curr.setUTCMonth(curr.getUTCMonth() + 1);
    }
    return out;
  }

  /** Fill transfer trend gaps so chart has one point per period (period as ISO string). */
  private fillTransferTrendGaps(
    data: { period: Date | string; transferCount: number }[],
    startDate: Date,
    endDate: Date,
    granularity: Granularity,
  ): { period: string; transferCount: number }[] {
    const toKey = (d: Date) => {
      const y = d.getUTCFullYear();
      const m = String(d.getUTCMonth() + 1).padStart(2, "0");
      const day = String(d.getUTCDate()).padStart(2, "0");
      if (granularity === "day") return `${y}-${m}-${day}`;
      if (granularity === "week") {
        const jan1 = new Date(Date.UTC(y, 0, 1));
        const weekNo = Math.ceil(
          (d.getTime() - jan1.getTime()) / (7 * 24 * 60 * 60 * 1000),
        );
        return `${y}-W${weekNo}`;
      }
      return `${y}-${m}`;
    };
    const map = new Map<string, number>();
    for (const row of data) {
      const p =
        typeof row.period === "string" ? new Date(row.period) : row.period;
      map.set(toKey(p), row.transferCount);
    }
    const out: { period: string; transferCount: number }[] = [];
    const curr = new Date(startDate);
    curr.setUTCHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setUTCHours(23, 59, 59, 999);
    while (curr <= end) {
      const key = toKey(curr);
      out.push({
        period: curr.toISOString(),
        transferCount: map.get(key) ?? 0,
      });
      if (granularity === "day") curr.setUTCDate(curr.getUTCDate() + 1);
      else if (granularity === "week") curr.setUTCDate(curr.getUTCDate() + 7);
      else curr.setUTCMonth(curr.getUTCMonth() + 1);
    }
    return out;
  }

  /**
   * Get resolution analytics overview.
   */
  async getResolutionOverview(
    tenantId: string,
    granularity: Granularity = "day",
    periods: number = 30,
    startDateStr?: string,
    endDateStr?: string,
  ) {
    const { startDate, endDate } = this.resolveDateRange(
      granularity,
      periods,
      startDateStr,
      endDateStr,
    );

    const stats = await this.eventRepository.getResolutionStats(
      tenantId,
      startDate,
      endDate,
    );

    // Get previous period for comparison
    const prevEndDate = new Date(startDate);
    const prevStartDate = this.calculateStartDate(granularity, periods * 2);
    const prevStats = await this.eventRepository.getResolutionStats(
      tenantId,
      prevStartDate,
      prevEndDate,
    );

    const percentChange =
      prevStats.totalResolved > 0
        ? ((stats.totalResolved - prevStats.totalResolved) /
            prevStats.totalResolved) *
          100
        : 0;

    return {
      ...stats,
      percentChange,
      startDate,
      endDate,
      granularity,
    };
  }

  /**
   * Get resolution trend over time. Fills gaps so chart has one point per period.
   */
  async getResolutionTrend(
    tenantId: string,
    granularity: Granularity = "day",
    periods: number = 30,
    startDateStr?: string,
    endDateStr?: string,
  ) {
    const { startDate, endDate } = this.resolveDateRange(
      granularity,
      periods,
      startDateStr,
      endDateStr,
    );

    const raw = await this.eventRepository.getResolutionTrend(
      tenantId,
      startDate,
      endDate,
      granularity,
    );

    const data = this.fillResolutionTrendGaps(
      raw,
      startDate,
      endDate,
      granularity,
    );

    const totalResolved = data.reduce(
      (sum: number, d: { resolvedCount: number }) => sum + d.resolvedCount,
      0,
    );

    const midpoint = Math.floor(data.length / 2);
    const firstHalf = data.slice(0, midpoint);
    const secondHalf = data.slice(midpoint);

    const firstHalfTotal = firstHalf.reduce(
      (sum: number, d: { resolvedCount: number }) => sum + d.resolvedCount,
      0,
    );
    const secondHalfTotal = secondHalf.reduce(
      (sum: number, d: { resolvedCount: number }) => sum + d.resolvedCount,
      0,
    );

    const percentChange =
      firstHalfTotal > 0
        ? ((secondHalfTotal - firstHalfTotal) / firstHalfTotal) * 100
        : 0;

    return {
      data,
      summary: {
        totalResolved,
        avgPerPeriod:
          data.length > 0 ? Math.round(totalResolved / data.length) : 0,
        percentChange,
      },
      startDate,
      endDate,
      granularity,
    };
  }

  /**
   * Get resolution breakdown by category.
   */
  async getResolutionByCategory(
    tenantId: string,
    granularity: Granularity = "day",
    periods: number = 30,
    startDateStr?: string,
    endDateStr?: string,
  ) {
    const { startDate, endDate } = this.resolveDateRange(
      granularity,
      periods,
      startDateStr,
      endDateStr,
    );

    const data = await this.eventRepository.getResolutionByCategory(
      tenantId,
      startDate,
      endDate,
    );

    const totalResolved = data.reduce(
      (sum: number, d: { count: number }) => sum + d.count,
      0,
    );

    const enrichedData = data.map((d: { category: string; count: number }) => ({
      ...d,
      percentage: totalResolved > 0 ? (d.count / totalResolved) * 100 : 0,
    }));

    return {
      data: enrichedData,
      summary: {
        totalResolved,
        uniqueCategories: data.length,
      },
      startDate,
      endDate,
    };
  }

  /**
   * List individual resolutions (wrap-up submissions) so analytics can show each filled report.
   * Note: resolutions table does not contain tenantId; we join via session.tenantId.
   */
  async getResolutionSubmissions(
    tenantId: string,
    granularity: Granularity = "day",
    periods: number = 30,
    page: number = 1,
    limit: number = 20,
    startDateStr?: string,
    endDateStr?: string,
  ): Promise<{
    data: Array<{
      id: string;
      sessionId: string;
      contactId: string;
      contactName: string | null;
      category: string;
      outcome: string;
      notes: string | null;
      formData: Record<string, string | number | boolean> | null;
      resolvedByAgentId: string;
      resolvedByAgentName: string | null;
      createdAt: string;
    }>;
    total: number;
    page: number;
    limit: number;
    startDate: string;
    endDate: string;
    granularity: string;
  }> {
    const { startDate, endDate } = this.resolveDateRange(
      granularity,
      periods,
      startDateStr,
      endDateStr,
    );

    const qb = this.resolutionRepo
      .createQueryBuilder("r")
      .innerJoinAndSelect("r.session", "s")
      .where("s.tenantId = :tenantId", { tenantId })
      .andWhere("r.createdAt BETWEEN :start AND :end", {
        start: startDate,
        end: endDate,
      })
      .orderBy("r.createdAt", "DESC")
      .skip((Math.max(page, 1) - 1) * limit)
      .take(limit);

    const [rows, total] = await qb.getManyAndCount();

    const agentIds = [
      ...new Set(rows.map((r) => r.resolvedByAgentId).filter(Boolean)),
    ];
    const users =
      agentIds.length > 0
        ? await this.userRepo.find({ where: { id: In(agentIds) } })
        : [];
    const nameMap = new Map(users.map((u) => [u.id, u.name ?? null]));

    return {
      data: rows.map((r) => ({
        id: r.id,
        sessionId: r.sessionId,
        contactId: r.session?.contactId ?? "",
        contactName: r.session?.contactName ?? null,
        category: r.category,
        outcome: r.outcome,
        notes: r.notes ?? null,
        formData: r.formData ?? null,
        resolvedByAgentId: r.resolvedByAgentId,
        resolvedByAgentName: nameMap.get(r.resolvedByAgentId) ?? null,
        createdAt: r.createdAt.toISOString(),
      })),
      total,
      page: Math.max(page, 1),
      limit,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      granularity,
    };
  }

  /**
   * Get transfer analytics overview.
   */
  async getTransferOverview(
    tenantId: string,
    granularity: Granularity = "day",
    periods: number = 30,
    startDateStr?: string,
    endDateStr?: string,
  ) {
    const { startDate, endDate } = this.resolveDateRange(
      granularity,
      periods,
      startDateStr,
      endDateStr,
    );

    const stats = await this.eventRepository.getTransferStats(
      tenantId,
      startDate,
      endDate,
    );

    // Get previous period for comparison
    const prevEndDate = new Date(startDate);
    const prevStartDate = this.calculateStartDate(granularity, periods * 2);
    const prevStats = await this.eventRepository.getTransferStats(
      tenantId,
      prevStartDate,
      prevEndDate,
    );

    const percentChange =
      prevStats.totalTransfers > 0
        ? ((stats.totalTransfers - prevStats.totalTransfers) /
            prevStats.totalTransfers) *
          100
        : 0;

    return {
      ...stats,
      percentChange,
      startDate,
      endDate,
      granularity,
    };
  }

  /**
   * Get transfer trend over time. Fills gaps so chart has one point per period.
   */
  async getTransferTrend(
    tenantId: string,
    granularity: Granularity = "day",
    periods: number = 30,
    startDateStr?: string,
    endDateStr?: string,
  ) {
    const { startDate, endDate } = this.resolveDateRange(
      granularity,
      periods,
      startDateStr,
      endDateStr,
    );

    const raw = await this.eventRepository.getTransferTrend(
      tenantId,
      startDate,
      endDate,
      granularity,
    );

    const data = this.fillTransferTrendGaps(
      raw,
      startDate,
      endDate,
      granularity,
    );

    const totalTransfers = data.reduce(
      (sum: number, d: { transferCount: number }) => sum + d.transferCount,
      0,
    );

    const midpoint = Math.floor(data.length / 2);
    const firstHalf = data.slice(0, midpoint);
    const secondHalf = data.slice(midpoint);

    const firstHalfTotal = firstHalf.reduce(
      (sum: number, d: { transferCount: number }) => sum + d.transferCount,
      0,
    );
    const secondHalfTotal = secondHalf.reduce(
      (sum: number, d: { transferCount: number }) => sum + d.transferCount,
      0,
    );

    const percentChange =
      firstHalfTotal > 0
        ? ((secondHalfTotal - firstHalfTotal) / firstHalfTotal) * 100
        : 0;

    return {
      data,
      summary: {
        totalTransfers,
        avgPerPeriod:
          data.length > 0 ? Math.round(totalTransfers / data.length) : 0,
        percentChange,
      },
      startDate,
      endDate,
      granularity,
    };
  }

  /**
   * Get transfer breakdown by reason.
   */
  async getTransferByReason(
    tenantId: string,
    granularity: Granularity = "day",
    periods: number = 30,
    startDateStr?: string,
    endDateStr?: string,
  ) {
    const { startDate, endDate } = this.resolveDateRange(
      granularity,
      periods,
      startDateStr,
      endDateStr,
    );

    const data = await this.eventRepository.getTransferByReason(
      tenantId,
      startDate,
      endDate,
    );

    const totalTransfers = data.reduce(
      (sum: number, d: { count: number }) => sum + d.count,
      0,
    );

    const enrichedData = data.map((d: { reason: string; count: number }) => ({
      ...d,
      percentage: totalTransfers > 0 ? (d.count / totalTransfers) * 100 : 0,
    }));

    return {
      data: enrichedData,
      summary: {
        totalTransfers,
        uniqueReasons: data.length,
      },
      startDate,
      endDate,
    };
  }

  /**
   * Get expired chat statistics (chats with no activity for 24+ hours).
   */
  async getExpiredChatsOverview(tenantId: string) {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Count currently expired chats
    const expiredCount = await this.sessionRepo.count({
      where: {
        tenantId,
        status: SessionStatus.ASSIGNED,
        lastMessageAt: LessThan(twentyFourHoursAgo),
      },
    });

    // Count all assigned chats
    const assignedCount = await this.sessionRepo.count({
      where: {
        tenantId,
        status: SessionStatus.ASSIGNED,
      },
    });

    // Count resolved chats
    const resolvedCount = await this.sessionRepo.count({
      where: {
        tenantId,
        status: SessionStatus.RESOLVED,
      },
    });

    // Count unassigned chats
    const unassignedCount = await this.sessionRepo.count({
      where: {
        tenantId,
        status: SessionStatus.UNASSIGNED,
      },
    });

    const totalChats = assignedCount + resolvedCount + unassignedCount;
    const activeChats = assignedCount - expiredCount;

    return {
      expiredCount,
      activeChats,
      assignedCount,
      resolvedCount,
      unassignedCount,
      totalChats,
      expiredRate: assignedCount > 0 ? (expiredCount / assignedCount) * 100 : 0,
    };
  }

  /**
   * Get agent performance leaderboard.
   */
  async getAgentLeaderboard(
    tenantId: string,
    granularity: Granularity = "day",
    periods: number = 30,
    limit: number = 10,
    startDateStr?: string,
    endDateStr?: string,
  ) {
    const { startDate, endDate } = this.resolveDateRange(
      granularity,
      periods,
      startDateStr,
      endDateStr,
    );

    const data = await this.eventRepository.getAgentResolutionLeaderboard(
      tenantId,
      startDate,
      endDate,
      limit,
    );

    const totalResolved = data.reduce(
      (sum: number, d: { resolvedCount: number }) => sum + d.resolvedCount,
      0,
    );

    return {
      data,
      summary: {
        totalResolved,
        totalAgents: data.length,
        avgResolutionsPerAgent:
          data.length > 0 ? Math.round(totalResolved / data.length) : 0,
      },
      startDate,
      endDate,
      granularity,
    };
  }

  /**
   * Get combined dashboard stats for quick overview.
   */
  async getDashboardStats(
    tenantId: string,
    granularity: Granularity = "day",
    periods: number = 30,
    startDateStr?: string,
    endDateStr?: string,
  ) {
    const { startDate, endDate } = this.resolveDateRange(
      granularity,
      periods,
      startDateStr,
      endDateStr,
    );

    const [resolutions, transfers, expiredChats, agentSummary] =
      await Promise.all([
        this.getResolutionOverview(
          tenantId,
          granularity,
          periods,
          startDateStr,
          endDateStr,
        ),
        this.getTransferOverview(
          tenantId,
          granularity,
          periods,
          startDateStr,
          endDateStr,
        ),
        this.getExpiredChatsOverview(tenantId),
        this.eventRepository.getAgentPerformanceSummary(
          tenantId,
          startDate,
          endDate,
        ),
      ]);

    return {
      resolutions: {
        total: resolutions.totalResolved,
        uniqueAgents: resolutions.uniqueAgents,
        percentChange: resolutions.percentChange,
      },
      transfers: {
        total: transfers.totalTransfers,
        percentChange: transfers.percentChange,
      },
      chats: {
        expired: expiredChats.expiredCount,
        active: expiredChats.activeChats,
        resolved: expiredChats.resolvedCount,
        unassigned: expiredChats.unassignedCount,
        total: expiredChats.totalChats,
        expiredRate: expiredChats.expiredRate,
      },
      agents: {
        activeAgents: agentSummary.agentsWithResolutions,
        totalHandoffs: agentSummary.totalHandoffs,
        resolutionRate: agentSummary.resolutionRate,
        avgResolutionsPerAgent: agentSummary.avgResolutionsPerAgent,
      },
      startDate: resolutions.startDate,
      endDate: resolutions.endDate,
      granularity,
    };
  }

  // ===========================================================================
  // AGENT PERFORMANCE ANALYTICS
  // ===========================================================================

  /**
   * Get agent activity trend (active agents per period).
   */
  async getAgentActivityTrend(
    tenantId: string,
    granularity: Granularity = "day",
    periods: number = 30,
    startDateStr?: string,
    endDateStr?: string,
  ) {
    const { startDate, endDate } = this.resolveDateRange(
      granularity,
      periods,
      startDateStr,
      endDateStr,
    );

    const data = await this.eventRepository.getAgentActivityTrend(
      tenantId,
      startDate,
      endDate,
      granularity,
    );

    const totalActiveAgents = Math.max(
      ...data.map((d: { activeAgents: number }) => d.activeAgents),
      0,
    );
    const avgActiveAgents =
      data.length > 0
        ? data.reduce(
            (sum: number, d: { activeAgents: number }) => sum + d.activeAgents,
            0,
          ) / data.length
        : 0;

    return {
      data,
      summary: {
        peakActiveAgents: totalActiveAgents,
        avgActiveAgents: Math.round(avgActiveAgents * 10) / 10,
      },
      startDate,
      endDate,
      granularity,
    };
  }

  /**
   * Get detailed stats for all agents.
   */
  async getAgentDetailedStats(
    tenantId: string,
    granularity: Granularity = "day",
    periods: number = 30,
    startDateStr?: string,
    endDateStr?: string,
  ) {
    const { startDate, endDate } = this.resolveDateRange(
      granularity,
      periods,
      startDateStr,
      endDateStr,
    );

    const data = await this.eventRepository.getAgentDetailedStats(
      tenantId,
      startDate,
      endDate,
    );

    const totalChatsHandled = data.reduce(
      (sum: number, d: { totalChatsHandled: number }) =>
        sum + d.totalChatsHandled,
      0,
    );

    // Calculate resolution rate for each agent
    const enrichedData = data.map(
      (d: {
        agentId: string;
        resolvedCount: number;
        handoffsReceived: number;
        transfersOut: number;
        transfersIn: number;
        totalChatsHandled: number;
      }) => ({
        ...d,
        resolutionRate:
          d.handoffsReceived > 0
            ? Math.round((d.resolvedCount / d.handoffsReceived) * 1000) / 10
            : 0,
      }),
    );

    return {
      data: enrichedData,
      summary: {
        totalAgents: data.length,
        totalChatsHandled,
        avgChatsPerAgent:
          data.length > 0 ? Math.round(totalChatsHandled / data.length) : 0,
      },
      startDate,
      endDate,
      granularity,
    };
  }

  /**
   * Get agent workload distribution.
   */
  async getAgentWorkloadDistribution(
    tenantId: string,
    granularity: Granularity = "day",
    periods: number = 30,
    startDateStr?: string,
    endDateStr?: string,
  ) {
    const { startDate, endDate } = this.resolveDateRange(
      granularity,
      periods,
      startDateStr,
      endDateStr,
    );

    const data = await this.eventRepository.getAgentWorkloadDistribution(
      tenantId,
      startDate,
      endDate,
    );

    // Calculate workload balance score (lower stddev relative to avg = better balance)
    const workloadBalanceScore =
      data.avgChatsPerAgent > 0
        ? Math.max(0, 100 - (data.stddevChats / data.avgChatsPerAgent) * 50)
        : 0;

    return {
      ...data,
      workloadBalanceScore: Math.round(workloadBalanceScore),
      startDate,
      endDate,
      granularity,
    };
  }

  /**
   * Get agent performance summary.
   */
  async getAgentPerformanceSummary(
    tenantId: string,
    granularity: Granularity = "day",
    periods: number = 30,
    startDateStr?: string,
    endDateStr?: string,
  ) {
    const { startDate, endDate } = this.resolveDateRange(
      granularity,
      periods,
      startDateStr,
      endDateStr,
    );

    const current = await this.eventRepository.getAgentPerformanceSummary(
      tenantId,
      startDate,
      endDate,
    );

    // Get previous period for comparison
    const prevEndDate = new Date(startDate);
    const prevStartDate = this.calculateStartDate(granularity, periods * 2);
    const previous = await this.eventRepository.getAgentPerformanceSummary(
      tenantId,
      prevStartDate,
      prevEndDate,
    );

    const resolutionRateChange =
      previous.resolutionRate > 0
        ? ((current.resolutionRate - previous.resolutionRate) /
            previous.resolutionRate) *
          100
        : 0;

    return {
      ...current,
      resolutionRateChange,
      startDate,
      endDate,
      granularity,
    };
  }
}
