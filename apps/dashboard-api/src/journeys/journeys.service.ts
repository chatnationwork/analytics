/**
 * =============================================================================
 * JOURNEYS ANALYTICS SERVICE
 * =============================================================================
 *
 * Business logic for self-serve vs assisted journey analytics.
 * Provides insights into how users interact with bots vs human agents.
 */

import { Injectable } from "@nestjs/common";
import { EventRepository } from "@lib/database";

type Granularity = "day" | "week" | "month";

@Injectable()
export class JourneysService {
  constructor(private readonly eventRepository: EventRepository) {}

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

    // Start from beginning of the day
    startDate.setHours(0, 0, 0, 0);
    return startDate;
  }

  /**
   * Get self-serve vs assisted journey overview.
   */
  async getOverview(
    tenantId: string,
    granularity: Granularity = "day",
    periods: number = 30,
  ) {
    const endDate = new Date();
    const startDate = this.calculateStartDate(granularity, periods);

    const stats = await this.eventRepository.getSelfServeVsAssistedStats(
      tenantId,
      startDate,
      endDate,
    );

    // Get previous period for comparison
    const prevEndDate = new Date(startDate);
    const prevStartDate = this.calculateStartDate(granularity, periods * 2);
    const prevStats = await this.eventRepository.getSelfServeVsAssistedStats(
      tenantId,
      prevStartDate,
      prevEndDate,
    );

    // Calculate changes
    const selfServeChange =
      prevStats.selfServeSessions > 0
        ? ((stats.selfServeSessions - prevStats.selfServeSessions) /
            prevStats.selfServeSessions) *
          100
        : 0;

    const assistedChange =
      prevStats.assistedSessions > 0
        ? ((stats.assistedSessions - prevStats.assistedSessions) /
            prevStats.assistedSessions) *
          100
        : 0;

    return {
      ...stats,
      selfServeChange,
      assistedChange,
      startDate,
      endDate,
      granularity,
    };
  }

  /**
   * Get handoff rate trend over time.
   */
  async getHandoffTrend(
    tenantId: string,
    granularity: Granularity = "day",
    periods: number = 30,
  ) {
    const endDate = new Date();
    const startDate = this.calculateStartDate(granularity, periods);

    const data = await this.eventRepository.getHandoffRateTrend(
      tenantId,
      startDate,
      endDate,
      granularity,
    );

    // Calculate summary
    const totalSessions = data.reduce((sum, d) => sum + d.totalSessions, 0);
    const totalHandoffs = data.reduce((sum, d) => sum + d.assisted, 0);
    const avgHandoffRate =
      totalSessions > 0 ? (totalHandoffs / totalSessions) * 100 : 0;

    // Calculate trend (first half vs second half)
    const midpoint = Math.floor(data.length / 2);
    const firstHalf = data.slice(0, midpoint);
    const secondHalf = data.slice(midpoint);

    const firstHalfHandoffs = firstHalf.reduce((sum, d) => sum + d.assisted, 0);
    const firstHalfSessions = firstHalf.reduce(
      (sum, d) => sum + d.totalSessions,
      0,
    );
    const firstHalfRate =
      firstHalfSessions > 0 ? (firstHalfHandoffs / firstHalfSessions) * 100 : 0;

    const secondHalfHandoffs = secondHalf.reduce(
      (sum, d) => sum + d.assisted,
      0,
    );
    const secondHalfSessions = secondHalf.reduce(
      (sum, d) => sum + d.totalSessions,
      0,
    );
    const secondHalfRate =
      secondHalfSessions > 0
        ? (secondHalfHandoffs / secondHalfSessions) * 100
        : 0;

    const percentChange =
      firstHalfRate > 0
        ? ((secondHalfRate - firstHalfRate) / firstHalfRate) * 100
        : 0;

    return {
      data,
      summary: {
        totalSessions,
        totalHandoffs,
        avgHandoffRate,
        percentChange,
      },
      startDate,
      endDate,
      granularity,
    };
  }

  /**
   * Get handoff breakdown by step/reason.
   */
  async getHandoffByStep(
    tenantId: string,
    granularity: Granularity = "day",
    periods: number = 30,
  ) {
    const endDate = new Date();
    const startDate = this.calculateStartDate(granularity, periods);

    const data = await this.eventRepository.getHandoffByStep(
      tenantId,
      startDate,
      endDate,
    );

    const totalHandoffs = data.reduce(
      (sum: number, d: { handoffs: number }) => sum + d.handoffs,
      0,
    );

    // Add percentage to each step
    const enrichedData = data.map((d: { step: string; handoffs: number }) => ({
      ...d,
      percentage: totalHandoffs > 0 ? (d.handoffs / totalHandoffs) * 100 : 0,
    }));

    return {
      data: enrichedData,
      summary: {
        totalHandoffs,
        uniqueSteps: data.length,
      },
      startDate,
      endDate,
    };
  }

  /**
   * Get handoff reasons breakdown.
   */
  async getHandoffReasons(
    tenantId: string,
    granularity: Granularity = "day",
    periods: number = 30,
  ) {
    const endDate = new Date();
    const startDate = this.calculateStartDate(granularity, periods);

    const data = await this.eventRepository.getHandoffReasons(
      tenantId,
      startDate,
      endDate,
    );

    const totalHandoffs = data.reduce(
      (sum: number, d: { count: number }) => sum + d.count,
      0,
    );

    const enrichedData = data.map((d: { reason: string; count: number }) => ({
      ...d,
      percentage: totalHandoffs > 0 ? (d.count / totalHandoffs) * 100 : 0,
    }));

    return {
      data: enrichedData,
      summary: { totalHandoffs },
      startDate,
      endDate,
    };
  }

  /**
   * Get time to handoff metrics.
   */
  async getTimeToHandoff(
    tenantId: string,
    granularity: Granularity = "day",
    periods: number = 30,
  ) {
    const endDate = new Date();
    const startDate = this.calculateStartDate(granularity, periods);

    const stats = await this.eventRepository.getTimeToHandoff(
      tenantId,
      startDate,
      endDate,
    );

    // Format seconds to human readable
    const formatTime = (seconds: number) => {
      if (seconds < 60) return `${Math.round(seconds)}s`;
      if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
      return `${Math.round(seconds / 3600)}h`;
    };

    return {
      ...stats,
      avgFormatted: formatTime(stats.avgSeconds),
      medianFormatted: formatTime(stats.medianSeconds),
      p95Formatted: formatTime(stats.p95Seconds),
      startDate,
      endDate,
    };
  }

  /**
   * Get per-journey breakdown (assisted + completed self-serve per journey step).
   */
  async getJourneyBreakdown(
    tenantId: string,
    granularity: Granularity = "day",
    periods: number = 30,
  ) {
    const endDate = new Date();
    const startDate = this.calculateStartDate(granularity, periods);

    const data = await this.eventRepository.getJourneyBreakdown(
      tenantId,
      startDate,
      endDate,
    );

    const totalAssisted = data.reduce((sum, d) => sum + d.assisted, 0);
    const totalCompleted = data.reduce(
      (sum, d) => sum + d.completedSelfServe,
      0,
    );

    return {
      data,
      summary: {
        totalAssisted,
        totalCompleted,
        journeyCount: data.length,
      },
      startDate,
      endDate,
    };
  }

  /**
   * Get agent performance for handoffs.
   */
  async getAgentPerformance(
    tenantId: string,
    granularity: Granularity = "day",
    periods: number = 30,
  ) {
    const endDate = new Date();
    const startDate = this.calculateStartDate(granularity, periods);

    const data = await this.eventRepository.getAgentHandoffStats(
      tenantId,
      startDate,
      endDate,
    );

    const totalHandoffs = data.reduce(
      (sum: number, d: { totalHandoffs: number }) => sum + d.totalHandoffs,
      0,
    );

    return {
      data,
      summary: {
        totalHandoffs,
        totalAgents: data.length,
        avgHandoffsPerAgent:
          data.length > 0 ? Math.round(totalHandoffs / data.length) : 0,
      },
      startDate,
      endDate,
    };
  }
}
