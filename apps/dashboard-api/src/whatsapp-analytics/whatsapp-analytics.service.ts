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
}
