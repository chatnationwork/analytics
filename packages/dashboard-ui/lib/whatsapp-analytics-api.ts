import { fetchWithAuth } from './api';

export type Granularity = 'day' | 'week' | 'month';

export const whatsappAnalyticsApi = {
  getStats: async (startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    return fetchWithAuth(`/whatsapp-analytics/stats?${params.toString()}`);
  },

  getVolume: async (startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    return fetchWithAuth(`/whatsapp-analytics/volume?${params.toString()}`);
  },

  getHeatmap: async (startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    return fetchWithAuth(`/whatsapp-analytics/heatmap?${params.toString()}`);
  },

  getAgents: async (startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    return fetchWithAuth(`/whatsapp-analytics/agents?${params.toString()}`);
  },

  getCountries: async (startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    return fetchWithAuth(`/whatsapp-analytics/countries?${params.toString()}`);
  },

  getResponseTime: async (startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    return fetchWithAuth(`/whatsapp-analytics/response-time?${params.toString()}`);
  },

  getFunnel: async (startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    return fetchWithAuth(`/whatsapp-analytics/funnel?${params.toString()}`);
  },

  getResolutionStats: async (startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    return fetchWithAuth(`/whatsapp-analytics/resolution-stats?${params.toString()}`);
  },

  getConversationLength: async (startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    return fetchWithAuth(`/whatsapp-analytics/conversation-length?${params.toString()}`);
  },

  // =============================================================================
  // TREND ENDPOINTS
  // =============================================================================

  getMessageVolumeTrend: async (granularity: Granularity = 'day', periods: number = 30) => {
    return fetchWithAuth(
      `/whatsapp-analytics/trends/volume?granularity=${granularity}&periods=${periods}`,
    );
  },

  getResponseTimeTrend: async (granularity: Granularity = 'day', periods: number = 30) => {
    return fetchWithAuth(
      `/whatsapp-analytics/trends/response-time?granularity=${granularity}&periods=${periods}`,
    );
  },

  getReadRateTrend: async (granularity: Granularity = 'day', periods: number = 30) => {
    return fetchWithAuth(
      `/whatsapp-analytics/trends/read-rate?granularity=${granularity}&periods=${periods}`,
    );
  },

  getNewContactsTrend: async (granularity: Granularity = 'day', periods: number = 30) => {
    return fetchWithAuth(
      `/whatsapp-analytics/trends/new-contacts?granularity=${granularity}&periods=${periods}`,
    );
  },
};

