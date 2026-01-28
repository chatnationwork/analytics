import { Injectable } from '@nestjs/common';
import { SessionRepository, EventRepository } from '@lib/database';

type Granularity = 'day' | 'week' | 'month';

@Injectable()
export class TrendsService {
  constructor(
    private readonly sessionRepository: SessionRepository,
    private readonly eventRepository: EventRepository,
  ) {}

  /**
   * Calculate start date based on granularity and number of periods.
   */
  private calculateStartDate(granularity: Granularity, periods: number): Date {
    const now = new Date();
    switch (granularity) {
      case 'day':
        return new Date(now.getTime() - periods * 24 * 60 * 60 * 1000);
      case 'week':
        return new Date(now.getTime() - periods * 7 * 24 * 60 * 60 * 1000);
      case 'month':
        const monthsAgo = new Date(now);
        monthsAgo.setMonth(monthsAgo.getMonth() - periods);
        return monthsAgo;
    }
  }

  /**
   * Get session count trend over time.
   */
  async getSessionTrend(
    tenantId: string,
    granularity: Granularity = 'day',
    periods: number = 30,
  ) {
    const endDate = new Date();
    const startDate = this.calculateStartDate(granularity, periods);
    
    const data = await this.sessionRepository.getSessionTrend(
      tenantId,
      startDate,
      endDate,
      granularity,
    );

    // Calculate period-over-period change
    const currentPeriodTotal = data.reduce((sum, d) => sum + d.count, 0);
    
    // Get previous period for comparison
    const previousEndDate = startDate;
    const previousStartDate = this.calculateStartDate(granularity, periods * 2);
    const previousData = await this.sessionRepository.getSessionTrend(
      tenantId,
      previousStartDate,
      previousEndDate,
      granularity,
    );
    const previousPeriodTotal = previousData.reduce((sum, d) => sum + d.count, 0);
    
    const percentChange = previousPeriodTotal > 0 
      ? ((currentPeriodTotal - previousPeriodTotal) / previousPeriodTotal) * 100 
      : 0;

    return {
      data,
      summary: {
        total: currentPeriodTotal,
        previousTotal: previousPeriodTotal,
        percentChange: Math.round(percentChange * 10) / 10,
      },
      granularity,
      startDate,
      endDate,
    };
  }

  /**
   * Get conversion rate trend over time.
   */
  async getConversionTrend(
    tenantId: string,
    granularity: Granularity = 'day',
    periods: number = 30,
  ) {
    const endDate = new Date();
    const startDate = this.calculateStartDate(granularity, periods);
    
    const data = await this.sessionRepository.getConversionTrend(
      tenantId,
      startDate,
      endDate,
      granularity,
    );

    // Calculate overall conversion rate for the period
    const totalSessions = data.reduce((sum, d) => sum + d.totalSessions, 0);
    const totalConversions = data.reduce((sum, d) => sum + d.conversions, 0);
    const overallRate = totalSessions > 0 ? totalConversions / totalSessions : 0;

    return {
      data,
      summary: {
        totalSessions,
        totalConversions,
        overallConversionRate: Math.round(overallRate * 1000) / 10, // e.g., 42.5%
      },
      granularity,
      startDate,
      endDate,
    };
  }

  /**
   * Get user growth trend (new vs returning).
   */
  async getUserGrowthTrend(
    tenantId: string,
    granularity: Granularity = 'day',
    periods: number = 30,
  ) {
    const endDate = new Date();
    const startDate = this.calculateStartDate(granularity, periods);
    
    const data = await this.sessionRepository.getUserGrowthTrend(
      tenantId,
      startDate,
      endDate,
      granularity,
    );

    const totalNew = data.reduce((sum: number, d: { newUsers: number }) => sum + d.newUsers, 0);
    const totalReturning = data.reduce((sum: number, d: { returningUsers: number }) => sum + d.returningUsers, 0);

    return {
      data,
      summary: {
        totalNewUsers: totalNew,
        totalReturningUsers: totalReturning,
        totalUsers: totalNew + totalReturning,
        newUserPercent: totalNew + totalReturning > 0 
          ? Math.round((totalNew / (totalNew + totalReturning)) * 100) 
          : 0,
      },
      granularity,
      startDate,
      endDate,
    };
  }

  /**
   * Get session duration trend.
   */
  async getSessionDurationTrend(
    tenantId: string,
    granularity: Granularity = 'day',
    periods: number = 30,
  ) {
    const endDate = new Date();
    const startDate = this.calculateStartDate(granularity, periods);
    
    const data = await this.sessionRepository.getSessionDurationTrend(
      tenantId,
      startDate,
      endDate,
      granularity,
    );

    // Calculate overall average
    const totalDuration = data.reduce((sum, d) => sum + (d.avgDurationSeconds * d.sessionCount), 0);
    const totalSessions = data.reduce((sum, d) => sum + d.sessionCount, 0);
    const overallAvg = totalSessions > 0 ? totalDuration / totalSessions : 0;

    return {
      data,
      summary: {
        overallAvgDurationSeconds: Math.round(overallAvg),
        totalSessionsAnalyzed: totalSessions,
      },
      granularity,
      startDate,
      endDate,
    };
  }

  /**
   * Get daily active users trend.
   */
  async getDailyActiveUsersTrend(
    tenantId: string,
    periods: number = 30,
  ) {
    const endDate = new Date();
    const startDate = this.calculateStartDate('day', periods);
    
    const data = await this.eventRepository.getDailyActiveUsers(
      tenantId,
      startDate,
      endDate,
    );

    const totalDAU = data.reduce((sum, d) => sum + d.count, 0);
    const avgDAU = data.length > 0 ? Math.round(totalDAU / data.length) : 0;

    return {
      data,
      summary: {
        avgDailyActiveUsers: avgDAU,
        peakDAU: Math.max(...data.map(d => d.count), 0),
        totalDataPoints: data.length,
      },
      startDate,
      endDate,
    };
  }
}
