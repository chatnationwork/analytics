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
import { Repository, LessThan } from "typeorm";
import {
  EventRepository,
  InboxSessionEntity,
  SessionStatus,
} from "@lib/database";

type Granularity = "day" | "week" | "month";

@Injectable()
export class AgentInboxAnalyticsService {
  constructor(
    private readonly eventRepository: EventRepository,
    @InjectRepository(InboxSessionEntity)
    private readonly sessionRepo: Repository<InboxSessionEntity>,
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
   * Get resolution analytics overview.
   */
  async getResolutionOverview(
    tenantId: string,
    granularity: Granularity = "day",
    periods: number = 30,
  ) {
    const endDate = new Date();
    const startDate = this.calculateStartDate(granularity, periods);

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
   * Get resolution trend over time.
   */
  async getResolutionTrend(
    tenantId: string,
    granularity: Granularity = "day",
    periods: number = 30,
  ) {
    const endDate = new Date();
    const startDate = this.calculateStartDate(granularity, periods);

    const data = await this.eventRepository.getResolutionTrend(
      tenantId,
      startDate,
      endDate,
      granularity,
    );

    const totalResolved = data.reduce(
      (sum: number, d: { resolvedCount: number }) => sum + d.resolvedCount,
      0,
    );

    // Calculate trend (first half vs second half)
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
  ) {
    const endDate = new Date();
    const startDate = this.calculateStartDate(granularity, periods);

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
   * Get transfer analytics overview.
   */
  async getTransferOverview(
    tenantId: string,
    granularity: Granularity = "day",
    periods: number = 30,
  ) {
    const endDate = new Date();
    const startDate = this.calculateStartDate(granularity, periods);

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
   * Get transfer trend over time.
   */
  async getTransferTrend(
    tenantId: string,
    granularity: Granularity = "day",
    periods: number = 30,
  ) {
    const endDate = new Date();
    const startDate = this.calculateStartDate(granularity, periods);

    const data = await this.eventRepository.getTransferTrend(
      tenantId,
      startDate,
      endDate,
      granularity,
    );

    const totalTransfers = data.reduce(
      (sum: number, d: { transferCount: number }) => sum + d.transferCount,
      0,
    );

    // Calculate trend
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
  ) {
    const endDate = new Date();
    const startDate = this.calculateStartDate(granularity, periods);

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
  ) {
    const endDate = new Date();
    const startDate = this.calculateStartDate(granularity, periods);

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
  ) {
    const endDate = new Date();
    const startDate = this.calculateStartDate(granularity, periods);

    const [resolutions, transfers, expiredChats, agentSummary] =
      await Promise.all([
        this.getResolutionOverview(tenantId, granularity, periods),
        this.getTransferOverview(tenantId, granularity, periods),
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
  ) {
    const endDate = new Date();
    const startDate = this.calculateStartDate(granularity, periods);

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
  ) {
    const endDate = new Date();
    const startDate = this.calculateStartDate(granularity, periods);

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
  ) {
    const endDate = new Date();
    const startDate = this.calculateStartDate(granularity, periods);

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
  ) {
    const endDate = new Date();
    const startDate = this.calculateStartDate(granularity, periods);

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
