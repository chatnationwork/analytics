import { fetchWithAuth, fetchBlobWithAuth } from "./api";

export type Granularity = "day" | "week" | "month";

export const whatsappAnalyticsApi = {
  getStats: async (startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (startDate) params.append("startDate", startDate);
    if (endDate) params.append("endDate", endDate);
    return fetchWithAuth(`/whatsapp-analytics/stats?${params.toString()}`);
  },

  getVolume: async (startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (startDate) params.append("startDate", startDate);
    if (endDate) params.append("endDate", endDate);
    return fetchWithAuth(`/whatsapp-analytics/volume?${params.toString()}`);
  },

  getHeatmap: async (startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (startDate) params.append("startDate", startDate);
    if (endDate) params.append("endDate", endDate);
    return fetchWithAuth(`/whatsapp-analytics/heatmap?${params.toString()}`);
  },

  getAgents: async (startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (startDate) params.append("startDate", startDate);
    if (endDate) params.append("endDate", endDate);
    return fetchWithAuth(`/whatsapp-analytics/agents?${params.toString()}`);
  },

  getCountries: async (startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (startDate) params.append("startDate", startDate);
    if (endDate) params.append("endDate", endDate);
    return fetchWithAuth(`/whatsapp-analytics/countries?${params.toString()}`);
  },

  getResponseTime: async (startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (startDate) params.append("startDate", startDate);
    if (endDate) params.append("endDate", endDate);
    return fetchWithAuth(
      `/whatsapp-analytics/response-time?${params.toString()}`,
    );
  },

  getFunnel: async (startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (startDate) params.append("startDate", startDate);
    if (endDate) params.append("endDate", endDate);
    return fetchWithAuth(`/whatsapp-analytics/funnel?${params.toString()}`);
  },

  getResolutionStats: async (startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (startDate) params.append("startDate", startDate);
    if (endDate) params.append("endDate", endDate);
    return fetchWithAuth(
      `/whatsapp-analytics/resolution-stats?${params.toString()}`,
    );
  },

  getConversationLength: async (startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (startDate) params.append("startDate", startDate);
    if (endDate) params.append("endDate", endDate);
    return fetchWithAuth(
      `/whatsapp-analytics/conversation-length?${params.toString()}`,
    );
  },

  // =============================================================================
  // TREND ENDPOINTS
  // =============================================================================

  getMessageVolumeTrend: async (
    granularity: Granularity = "day",
    periods: number = 30,
    startDate?: string,
    endDate?: string,
  ) => {
    const params = new URLSearchParams({
      granularity,
      periods: String(periods),
    });
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);
    return fetchWithAuth(
      `/whatsapp-analytics/trends/volume?${params.toString()}`,
    );
  },

  getResponseTimeTrend: async (
    granularity: Granularity = "day",
    periods: number = 30,
    startDate?: string,
    endDate?: string,
  ) => {
    const params = new URLSearchParams({
      granularity,
      periods: String(periods),
    });
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);
    return fetchWithAuth(
      `/whatsapp-analytics/trends/response-time?${params.toString()}`,
    );
  },

  getReadRateTrend: async (
    granularity: Granularity = "day",
    periods: number = 30,
    startDate?: string,
    endDate?: string,
  ) => {
    const params = new URLSearchParams({
      granularity,
      periods: String(periods),
    });
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);
    return fetchWithAuth(
      `/whatsapp-analytics/trends/read-rate?${params.toString()}`,
    );
  },

  getNewContactsTrend: async (
    granularity: Granularity = "day",
    periods: number = 30,
    startDate?: string,
    endDate?: string,
  ) => {
    const params = new URLSearchParams({
      granularity,
      periods: String(periods),
    });
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);
    return fetchWithAuth(
      `/whatsapp-analytics/trends/new-contacts?${params.toString()}`,
    );
  },

  getContacts: async (page = 1, limit = 20) => {
    return fetchWithAuth(
      `/whatsapp-analytics/contacts?page=${page}&limit=${limit}`,
    ) as Promise<{
      data: Array<{
        contact_id: string;
        name: string | null;
        first_seen: string;
        last_seen: string;
        message_count: number;
      }>;
      total: number;
      page: number;
      limit: number;
    }>;
  },

  exportContacts: async () => {
    return fetchBlobWithAuth("/whatsapp-analytics/contacts/export");
  },

  importContacts: async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    // Remove Content-Type header to let browser set it with boundary
    return fetchWithAuth("/whatsapp-analytics/contacts/import", {
      method: "POST",
      body: formData,
      headers: {},
    });
  },
};
