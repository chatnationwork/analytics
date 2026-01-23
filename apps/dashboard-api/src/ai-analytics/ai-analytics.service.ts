import { Injectable } from '@nestjs/common';
import { EventRepository } from '@lib/database';

@Injectable()
export class AiAnalyticsService {
  constructor(private readonly eventRepository: EventRepository) {}

  async getStats(tenantId: string, startDate?: Date, endDate?: Date) {
    const end = endDate || new Date();
    const start = startDate || new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
    return this.eventRepository.getAiStats(tenantId, start, end);
  }

  async getIntentBreakdown(tenantId: string, startDate?: Date, endDate?: Date, limit = 10) {
    const end = endDate || new Date();
    const start = startDate || new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
    return this.eventRepository.getAiIntentBreakdown(tenantId, start, end, limit);
  }

  async getLatencyDistribution(tenantId: string, startDate?: Date, endDate?: Date) {
    const end = endDate || new Date();
    const start = startDate || new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
    return this.eventRepository.getAiLatencyDistribution(tenantId, start, end);
  }

  async getErrorBreakdown(tenantId: string, startDate?: Date, endDate?: Date) {
    const end = endDate || new Date();
    const start = startDate || new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
    return this.eventRepository.getAiErrorBreakdown(tenantId, start, end);
  }
}
