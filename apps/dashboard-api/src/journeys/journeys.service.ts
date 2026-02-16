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

/** Default journey step keys -> display labels (config/API can override per tenant later). */
export const DEFAULT_JOURNEY_LABELS: Record<string, string> = {
  "Sales Invoice": "Sales Invoice",
  "Credit Note": "Credit Note",
  "Buyer-Initiated Invoices": "Buyer-Initiated Invoices",
  eTIMS: "eTIMS",
  "NIL Filing": "NIL Filing",
  MRI: "MRI",
  TOT: "TOT",
  PAYE: "PAYE",
  VAT: "VAT",
  Partnership: "Partnership",
  Excise: "Excise",
  "PIN Registration": "PIN Registration",
  "PIN Retrieve": "PIN Retrieve",
  "PIN Change": "PIN Change",
  "PIN Update": "PIN Update",
  "PIN Reactivate": "PIN Reactivate",
  "PIN Obligations": "PIN Obligations",
  "TCC Application": "TCC Application",
  "TCC Reprint": "TCC Reprint",
  "F88 Declaration": "F88 Declaration",
  TIMV: "TIMV",
  TEMV: "Extend TIMV",
  "Extend TIMV": "Extend TIMV",
  Forms: "Forms",
  Status: "Status",
  eSlip: "eSlip",
  NITA: "NITA",
  AHL: "AHL",
  "PIN Check": "PIN Check",
  "Invoice Check": "Invoice Check",
  "TCC Check": "TCC Check",
  "Staff Check": "Staff Check",
  Station: "Station",
  "Import Check": "Import Check",
  Refund: "Refund",
  "Report Fraud": "Report Fraud",
  More: "More",
  tax: "Tax",
  unknown: "Other",
};

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

    startDate.setHours(0, 0, 0, 0);
    return startDate;
  }

  /**
   * Resolve start/end dates: use explicit startDate/endDate when both provided (ISO date strings),
   * otherwise use granularity + periods. End date is set to end of day when explicit.
   */
  private resolveDateRange(options: {
    startDate?: string;
    endDate?: string;
    granularity: Granularity;
    periods: number;
  }): { startDate: Date; endDate: Date } {
    const {
      startDate: startStr,
      endDate: endStr,
      granularity,
      periods,
    } = options;
    if (startStr && endStr) {
      const startDate = new Date(startStr);
      const endDate = new Date(endStr);
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
      return { startDate, endDate };
    }
    const endDate = new Date();
    const startDate = this.calculateStartDate(granularity, periods);
    return { startDate, endDate };
  }

  /**
   * Get self-serve vs assisted journey overview.
   */
  async getOverview(
    tenantId: string,
    granularity: Granularity = "day",
    periods: number = 30,
    startDateStr?: string,
    endDateStr?: string,
  ) {
    const { startDate, endDate } = this.resolveDateRange({
      startDate: startDateStr,
      endDate: endDateStr,
      granularity,
      periods,
    });

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
    const calculateChange = (current: number, previous: number) => {
      if (previous === 0) return 0;
      return ((current - previous) / previous) * 100;
    };

    const selfServeSessions = stats.completedSelfServe + stats.abandonedSessions;
    const prevSelfServeSessions =
      prevStats.completedSelfServe + prevStats.abandonedSessions;

    // Rates (against journey-scoped total: completed + abandoned + assisted)
    const selfServeRate =
      stats.totalSessions > 0
        ? (selfServeSessions / stats.totalSessions) * 100
        : 0;
    const assistedRate =
      stats.totalSessions > 0
        ? (stats.assistedSessions / stats.totalSessions) * 100
        : 0;
    const completionRate =
      stats.totalSessions > 0
        ? (stats.completedSelfServe / stats.totalSessions) * 100
        : 0;
    const abandonmentRate =
      stats.totalSessions > 0
        ? (stats.abandonedSessions / stats.totalSessions) * 100
        : 0;

    return {
      totalSessions: stats.totalSessions,
      selfServeSessions,
      assistedSessions: stats.assistedSessions,
      completedSessions: stats.completedSelfServe,
      abandonedSessions: stats.abandonedSessions,
      botChatOnly: stats.botChatOnly,

      selfServeRate,
      assistedRate,
      completionRate,
      abandonmentRate,

      selfServeChange: calculateChange(selfServeSessions, prevSelfServeSessions),
      assistedChange: calculateChange(
        stats.assistedSessions,
        prevStats.assistedSessions,
      ),
      completionChange: calculateChange(
        stats.completedSelfServe,
        prevStats.completedSelfServe,
      ),
      abandonmentChange: calculateChange(
        stats.abandonedSessions,
        prevStats.abandonedSessions,
      ),
      botChatOnlyChange: calculateChange(
        stats.botChatOnly,
        prevStats.botChatOnly,
      ),

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
    startDateStr?: string,
    endDateStr?: string,
  ) {
    const { startDate, endDate } = this.resolveDateRange({
      startDate: startDateStr,
      endDate: endDateStr,
      granularity,
      periods,
    });

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
    startDateStr?: string,
    endDateStr?: string,
  ) {
    const { startDate, endDate } = this.resolveDateRange({
      startDate: startDateStr,
      endDate: endDateStr,
      granularity,
      periods,
    });

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
    startDateStr?: string,
    endDateStr?: string,
  ) {
    const { startDate, endDate } = this.resolveDateRange({
      startDate: startDateStr,
      endDate: endDateStr,
      granularity,
      periods,
    });

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
    startDateStr?: string,
    endDateStr?: string,
  ) {
    const { startDate, endDate } = this.resolveDateRange({
      startDate: startDateStr,
      endDate: endDateStr,
      granularity,
      periods,
    });

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
    startDateStr?: string,
    endDateStr?: string,
  ) {
    const { startDate, endDate } = this.resolveDateRange({
      startDate: startDateStr,
      endDate: endDateStr,
      granularity,
      periods,
    });

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
    startDateStr?: string,
    endDateStr?: string,
  ) {
    const { startDate, endDate } = this.resolveDateRange({
      startDate: startDateStr,
      endDate: endDateStr,
      granularity,
      periods,
    });

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

  /**
   * Get journey step keys -> display labels (config-driven; can be extended per tenant later).
   */
  getJourneyLabels(): Record<string, string> {
    return { ...DEFAULT_JOURNEY_LABELS };
  }
}
