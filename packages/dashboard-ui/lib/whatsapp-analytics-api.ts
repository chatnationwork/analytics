import { fetchWithAuth } from './api';

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
};

