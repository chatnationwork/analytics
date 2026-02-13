import { Injectable } from "@nestjs/common";
import { EventRepository } from "@lib/database";

type Granularity = "day" | "week" | "month";

@Injectable()
export class AiAnalyticsService {
  constructor(private readonly eventRepository: EventRepository) {}

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

  async getStats(tenantId: string, startDate?: Date, endDate?: Date) {
    const end = endDate || new Date();
    const start =
      startDate || new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
    return this.eventRepository.getAiStats(tenantId, start, end);
  }

  async getIntentBreakdown(
    tenantId: string,
    startDate?: Date,
    endDate?: Date,
    limit = 10,
  ) {
    const end = endDate || new Date();
    const start =
      startDate || new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
    return this.eventRepository.getAiIntentBreakdown(
      tenantId,
      start,
      end,
      limit,
    );
  }

  async getLatencyDistribution(
    tenantId: string,
    startDate?: Date,
    endDate?: Date,
  ) {
    const end = endDate || new Date();
    const start =
      startDate || new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
    return this.eventRepository.getAiLatencyDistribution(tenantId, start, end);
  }

  async getErrorBreakdown(tenantId: string, startDate?: Date, endDate?: Date) {
    const end = endDate || new Date();
    const start =
      startDate || new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
    return this.eventRepository.getAiErrorBreakdown(tenantId, start, end);
  }

  async getContainmentStats(
    tenantId: string,
    startDate?: Date,
    endDate?: Date,
  ) {
    const end = endDate || new Date();
    const start =
      startDate || new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
    return this.eventRepository.getAiContainmentStats(tenantId, start, end);
  }

  // ===========================================================================
  // AI TRENDS
  // ===========================================================================

  /**
   * Get AI classification volume trend.
   */
  async getClassificationTrend(
    tenantId: string,
    granularity: Granularity = "day",
    periods: number = 30,
    rangeStart?: Date,
    rangeEnd?: Date,
  ) {
    const endDate = rangeEnd || new Date();
    const startDate =
      rangeStart ||
      this.calculateStartDate(granularity, periods);

    const data = await this.eventRepository.getAiClassificationTrend(
      tenantId,
      startDate,
      endDate,
      granularity,
    );

    // Calculate summary
    const totalClassifications = data.reduce(
      (sum: number, d: { classifications: number }) => sum + d.classifications,
      0,
    );
    const totalErrors = data.reduce(
      (sum: number, d: { errors: number }) => sum + d.errors,
      0,
    );

    // Period comparison
    const midpoint = Math.floor(data.length / 2);
    const firstHalf = data.slice(0, midpoint);
    const secondHalf = data.slice(midpoint);

    const firstHalfTotal = firstHalf.reduce(
      (sum: number, d: { classifications: number }) => sum + d.classifications,
      0,
    );
    const secondHalfTotal = secondHalf.reduce(
      (sum: number, d: { classifications: number }) => sum + d.classifications,
      0,
    );

    const percentChange =
      firstHalfTotal > 0
        ? ((secondHalfTotal - firstHalfTotal) / firstHalfTotal) * 100
        : 0;

    return {
      data,
      summary: {
        totalClassifications,
        totalErrors,
        avgErrorRate:
          totalClassifications > 0
            ? (totalErrors / totalClassifications) * 100
            : 0,
        percentChange,
      },
      startDate,
      endDate,
      granularity,
    };
  }

  /**
   * Get AI latency trend.
   */
  async getLatencyTrend(
    tenantId: string,
    granularity: Granularity = "day",
    periods: number = 30,
    rangeStart?: Date,
    rangeEnd?: Date,
  ) {
    const endDate = rangeEnd || new Date();
    const startDate =
      rangeStart ||
      this.calculateStartDate(granularity, periods);

    const data = await this.eventRepository.getAiLatencyTrend(
      tenantId,
      startDate,
      endDate,
      granularity,
    );

    // Calculate overall averages
    const totalSamples = data.reduce(
      (sum: number, d: { sampleCount: number }) => sum + d.sampleCount,
      0,
    );
    const weightedP50 =
      totalSamples > 0
        ? data.reduce(
            (sum: number, d: { p50Latency: number; sampleCount: number }) =>
              sum + d.p50Latency * d.sampleCount,
            0,
          ) / totalSamples
        : 0;
    const weightedP95 =
      totalSamples > 0
        ? data.reduce(
            (sum: number, d: { p95Latency: number; sampleCount: number }) =>
              sum + d.p95Latency * d.sampleCount,
            0,
          ) / totalSamples
        : 0;

    return {
      data,
      summary: {
        avgP50Latency: weightedP50,
        avgP95Latency: weightedP95,
        totalSamples,
      },
      startDate,
      endDate,
      granularity,
    };
  }

  /**
   * Get AI confidence trend.
   */
  async getConfidenceTrend(
    tenantId: string,
    granularity: Granularity = "day",
    periods: number = 30,
  ) {
    const endDate = new Date();
    const startDate = this.calculateStartDate(granularity, periods);

    const data = await this.eventRepository.getAiConfidenceTrend(
      tenantId,
      startDate,
      endDate,
      granularity,
    );

    // Calculate overall average
    const totalSamples = data.reduce(
      (sum: number, d: { sampleCount: number }) => sum + d.sampleCount,
      0,
    );
    const weightedAvg =
      totalSamples > 0
        ? data.reduce(
            (sum: number, d: { avgConfidence: number; sampleCount: number }) =>
              sum + d.avgConfidence * d.sampleCount,
            0,
          ) / totalSamples
        : 0;

    return {
      data,
      summary: {
        avgConfidence: weightedAvg,
        totalSamples,
      },
      startDate,
      endDate,
      granularity,
    };
  }

  // ===========================================================================
  // AGENT PERFORMANCE TRENDS
  // ===========================================================================

  /**
   * Get agent resolved chats trend.
   */
  async getAgentResolvedTrend(
    tenantId: string,
    granularity: Granularity = "day",
    periods: number = 30,
  ) {
    const endDate = new Date();
    const startDate = this.calculateStartDate(granularity, periods);

    const data = await this.eventRepository.getAgentResolvedTrend(
      tenantId,
      startDate,
      endDate,
      granularity,
    );

    const totalResolved = data.reduce(
      (sum: number, d: { resolvedCount: number }) => sum + d.resolvedCount,
      0,
    );

    // Period comparison
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
        percentChange,
      },
      startDate,
      endDate,
      granularity,
    };
  }

  /**
   * Get agent resolution time trend.
   */
  async getAgentResolutionTimeTrend(
    tenantId: string,
    granularity: Granularity = "day",
    periods: number = 30,
  ) {
    const endDate = new Date();
    const startDate = this.calculateStartDate(granularity, periods);

    const data = await this.eventRepository.getAgentResolutionTimeTrend(
      tenantId,
      startDate,
      endDate,
      granularity,
    );

    // Calculate overall averages
    const totalSamples = data.reduce(
      (sum: number, d: { sampleCount: number }) => sum + d.sampleCount,
      0,
    );
    const weightedAvg =
      totalSamples > 0
        ? data.reduce(
            (
              sum: number,
              d: { avgResolutionTime: number; sampleCount: number },
            ) => sum + d.avgResolutionTime * d.sampleCount,
            0,
          ) / totalSamples
        : 0;

    return {
      data,
      summary: {
        avgResolutionTime: weightedAvg,
        totalSamples,
      },
      startDate,
      endDate,
      granularity,
    };
  }

  /**
   * Get top agents leaderboard.
   */
  async getTopAgents(
    tenantId: string,
    granularity: Granularity = "day",
    periods: number = 30,
    limit: number = 10,
  ) {
    const endDate = new Date();
    const startDate = this.calculateStartDate(granularity, periods);

    return this.eventRepository.getTopAgentsByResolutions(
      tenantId,
      startDate,
      endDate,
      limit,
    );
  }
}
