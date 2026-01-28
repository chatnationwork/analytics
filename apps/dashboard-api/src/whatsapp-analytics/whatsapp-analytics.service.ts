import { Injectable } from '@nestjs/common';
import { EventRepository } from '@lib/database';

@Injectable()
export class WhatsappAnalyticsService {
  constructor(private readonly eventRepository: EventRepository) {}

  async getStats(tenantId: string, startDate?: Date, endDate?: Date) {
    const end = endDate || new Date();
    const start = startDate || new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
    return this.eventRepository.getWhatsappStats(tenantId, start, end);
  }

  async getVolumeByHour(tenantId: string, startDate?: Date, endDate?: Date) {
    const end = endDate || new Date();
    const start = startDate || new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
    return this.eventRepository.getWhatsappVolumeByHour(tenantId, start, end);
  }

  async getHeatmap(tenantId: string, startDate?: Date, endDate?: Date) {
    const end = endDate || new Date();
    const start = startDate || new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
    return this.eventRepository.getWhatsappHeatmap(tenantId, start, end);
  }

  async getAgentPerformance(tenantId: string, startDate?: Date, endDate?: Date) {
    const end = endDate || new Date();
    const start = startDate || new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
    const results = await this.eventRepository.getWhatsappAgentPerformance(tenantId, start, end);
    return results.map(r => ({
      agentId: r.agent_id,
      chatCount: parseInt(r.chat_count, 10) || 0,
    }));
  }

  async getCountryBreakdown(tenantId: string, startDate?: Date, endDate?: Date) {
    const end = endDate || new Date();
    const start = startDate || new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
    const results = await this.eventRepository.getWhatsappCountryBreakdown(tenantId, start, end);
    return results.map(r => ({
      countryCode: r.country_code,
      count: parseInt(r.count, 10) || 0,
    }));
  }

  async getResponseTime(tenantId: string, startDate?: Date, endDate?: Date) {
    const end = endDate || new Date();
    const start = startDate || new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
    return this.eventRepository.getWhatsappResponseTime(tenantId, start, end);
  }

  async getFunnel(tenantId: string, startDate?: Date, endDate?: Date) {
    const end = endDate || new Date();
    const start = startDate || new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
    return this.eventRepository.getWhatsappFunnel(tenantId, start, end);
  }

  async getResolutionTimeStats(tenantId: string, startDate?: Date, endDate?: Date) {
    const end = endDate || new Date();
    const start = startDate || new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
    return this.eventRepository.getResolutionTimeStats(tenantId, start, end);
  }

  async getConversationLength(tenantId: string, startDate?: Date, endDate?: Date) {
    const end = endDate || new Date();
    const start = startDate || new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
    return this.eventRepository.getConversationLengthDistribution(tenantId, start, end);
  }

  // =============================================================================
  // TREND METHODS
  // =============================================================================

  private calculateStartDate(
    granularity: 'day' | 'week' | 'month',
    periods: number,
  ): Date {
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

  async getMessageVolumeTrend(
    tenantId: string,
    granularity: 'day' | 'week' | 'month' = 'day',
    periods: number = 30,
  ) {
    const endDate = new Date();
    const startDate = this.calculateStartDate(granularity, periods);

    const data = await this.eventRepository.getWhatsappMessageVolumeTrend(
      tenantId,
      startDate,
      endDate,
      granularity,
    );

    const totalReceived = data.reduce((sum: number, d: { received: number }) => sum + d.received, 0);
    const totalSent = data.reduce((sum: number, d: { sent: number }) => sum + d.sent, 0);

    return {
      data,
      summary: {
        totalReceived,
        totalSent,
        total: totalReceived + totalSent,
      },
      granularity,
      startDate,
      endDate,
    };
  }

  async getResponseTimeTrend(
    tenantId: string,
    granularity: 'day' | 'week' | 'month' = 'day',
    periods: number = 30,
  ) {
    const endDate = new Date();
    const startDate = this.calculateStartDate(granularity, periods);

    const data = await this.eventRepository.getWhatsappResponseTimeTrend(
      tenantId,
      startDate,
      endDate,
      granularity,
    );

    // Calculate overall median from the data
    const allResponseTimes = data.filter((d: { medianMinutes: number }) => d.medianMinutes > 0);
    const overallMedian = allResponseTimes.length > 0
      ? allResponseTimes.reduce((sum: number, d: { medianMinutes: number }) => sum + d.medianMinutes, 0) / allResponseTimes.length
      : 0;

    return {
      data,
      summary: {
        overallMedianMinutes: Math.round(overallMedian * 10) / 10,
        totalResponses: data.reduce((sum: number, d: { responseCount: number }) => sum + d.responseCount, 0),
        targetMinutes: 5, // SLA target
      },
      granularity,
      startDate,
      endDate,
    };
  }

  async getReadRateTrend(
    tenantId: string,
    granularity: 'day' | 'week' | 'month' = 'day',
    periods: number = 30,
  ) {
    const endDate = new Date();
    const startDate = this.calculateStartDate(granularity, periods);

    const data = await this.eventRepository.getWhatsappReadRateTrend(
      tenantId,
      startDate,
      endDate,
      granularity,
    );

    const totalSent = data.reduce((sum: number, d: { sent: number }) => sum + d.sent, 0);
    const totalRead = data.reduce((sum: number, d: { readCount: number }) => sum + d.readCount, 0);

    return {
      data,
      summary: {
        totalSent,
        totalRead,
        overallReadRate: totalSent > 0 ? Math.round((totalRead / totalSent) * 1000) / 10 : 0,
      },
      granularity,
      startDate,
      endDate,
    };
  }

  async getNewContactsTrend(
    tenantId: string,
    granularity: 'day' | 'week' | 'month' = 'day',
    periods: number = 30,
  ) {
    const endDate = new Date();
    const startDate = this.calculateStartDate(granularity, periods);

    const data = await this.eventRepository.getWhatsappNewContactsTrend(
      tenantId,
      startDate,
      endDate,
      granularity,
    );

    const totalNewContacts = data.reduce((sum: number, d: { newContacts: number }) => sum + d.newContacts, 0);

    // Get previous period for comparison
    const previousEndDate = startDate;
    const previousStartDate = this.calculateStartDate(granularity, periods * 2);
    const previousData = await this.eventRepository.getWhatsappNewContactsTrend(
      tenantId,
      previousStartDate,
      previousEndDate,
      granularity,
    );
    const previousTotal = previousData.reduce((sum: number, d: { newContacts: number }) => sum + d.newContacts, 0);

    const percentChange = previousTotal > 0
      ? ((totalNewContacts - previousTotal) / previousTotal) * 100
      : 0;

    return {
      data,
      summary: {
        totalNewContacts,
        previousTotal,
        percentChange: Math.round(percentChange * 10) / 10,
      },
      granularity,
      startDate,
      endDate,
    };
  }
}

