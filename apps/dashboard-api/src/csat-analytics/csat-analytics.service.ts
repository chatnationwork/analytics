/**
 * CSAT Analytics Service
 * Uses events with eventName = 'csat_submitted' (properties.rating, properties.feedback).
 */

import { Injectable } from "@nestjs/common";
import { EventRepository } from "@lib/database";

type Granularity = "day" | "week" | "month";

@Injectable()
export class CsatAnalyticsService {
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

  /**
   * Dashboard data: summary + recent feedback. Includes trend (percent change vs previous period).
   */
  async getDashboard(
    tenantId: string,
    granularity: Granularity = "day",
    periods: number = 30,
    rangeStart?: Date,
    rangeEnd?: Date,
  ) {
    const rawEnd = rangeEnd ?? new Date();
    const endDate = new Date(rawEnd);
    endDate.setUTCHours(23, 59, 59, 999); // Include full day (UTC)
    const startDate =
      rangeStart ?? this.calculateStartDate(granularity, periods);

    const summary = await this.eventRepository.getCsatSummary(
      tenantId,
      startDate,
      endDate,
    );
    const totalSent = await this.eventRepository.getCsatSentCount(
      tenantId,
      startDate,
      endDate,
    );
    const recentFeedback = await this.eventRepository.getCsatRecentFeedback(
      tenantId,
      startDate,
      endDate,
      20,
    );

    const prevEndDate = new Date(startDate);
    const prevStartDate = this.calculateStartDate(granularity, periods * 2);
    const prevSummary = await this.eventRepository.getCsatSummary(
      tenantId,
      prevStartDate,
      prevEndDate,
    );

    const percentChange =
      prevSummary.averageScore > 0
        ? ((summary.averageScore - prevSummary.averageScore) /
            prevSummary.averageScore) *
          100
        : 0;

    return {
      summary: {
        ...summary,
        totalSent,
        percentChange,
      },
      recentFeedback,
      startDate,
      endDate,
      granularity,
    };
  }

  /**
   * CSAT metrics grouped by journey (from session context: journeyStep or issue).
   */
  async getCsatByJourney(
    tenantId: string,
    granularity: Granularity = "day",
    periods: number = 30,
    rangeStart?: Date,
    rangeEnd?: Date,
  ) {
    const rawEnd = rangeEnd ?? new Date();
    const endDate = new Date(rawEnd);
    endDate.setUTCHours(23, 59, 59, 999); // Include full day (UTC)
    const startDate =
      rangeStart ?? this.calculateStartDate(granularity, periods);
    const byJourney = await this.eventRepository.getCsatByJourney(
      tenantId,
      startDate,
      endDate,
    );
    return {
      data: byJourney,
      startDate,
      endDate,
      granularity,
    };
  }

  /**
   * CSAT trend over time.
   */
  async getCsatTrend(
    tenantId: string,
    granularity: Granularity = "day",
    periods: number = 30,
    rangeStart?: Date,
    rangeEnd?: Date,
  ) {
    const rawEnd = rangeEnd ?? new Date();
    const endDate = new Date(rawEnd);
    endDate.setUTCHours(23, 59, 59, 999);
    const startDate =
      rangeStart ?? this.calculateStartDate(granularity, periods);

    const trend = await this.eventRepository.getCsatTrend(
      tenantId,
      startDate,
      endDate,
      granularity,
    );

    return {
      data: trend,
      startDate,
      endDate,
      granularity,
    };
  }
}
