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
  ) {
    const endDate = new Date();
    const startDate = this.calculateStartDate(granularity, periods);

    const summary = await this.eventRepository.getCsatSummary(
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
        percentChange,
      },
      recentFeedback,
      startDate,
      endDate,
      granularity,
    };
  }
}
