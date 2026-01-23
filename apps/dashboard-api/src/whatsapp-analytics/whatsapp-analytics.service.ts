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
}

