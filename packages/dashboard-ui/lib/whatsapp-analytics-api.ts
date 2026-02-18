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

  exportContactsConfigured: async (columns: string[], filters?: { tags?: string[] }) => {
    return fetchBlobWithAuth("/whatsapp-analytics/contacts/export", {
      method: "POST",
      body: JSON.stringify({ columns, filters }),
      headers: { "Content-Type": "application/json" },
    });
  },

  importContacts: async (
    file: File,
    strategy: "first" | "last" | "reject" = "last",
  ) => {
    const formData = new FormData();
    formData.append("file", file);
    return fetchWithAuth(
      `/whatsapp-analytics/contacts/import?strategy=${strategy}`,
      {
        method: "POST",
        body: formData,
        headers: {},
      },
    );
  },

  importContactsMapped: async (
    file: File,
    mapping: Record<string, string>,
    strategy: "first" | "last" | "reject" = "last",
  ) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("mapping", JSON.stringify(mapping));
    formData.append("strategy", strategy);
    
    return fetchWithAuth(`/whatsapp-analytics/contacts/import-mapped`, {
      method: "POST",
      body: formData,
      headers: {},
    });
  },

  getMappingTemplates: async () => {
    return fetchWithAuth("/whatsapp-analytics/mapping-templates") as Promise<
      Array<{
        id: string;
        name: string;
        mapping: Record<string, string>;
        createdAt: string;
      }>
    >;
  },

  createMappingTemplate: async (name: string, mapping: Record<string, string>) => {
    return fetchWithAuth("/whatsapp-analytics/mapping-templates", {
      method: "POST",
      body: JSON.stringify({ name, mapping }),
      headers: { "Content-Type": "application/json" },
    });
  },

  deleteMappingTemplate: async (id: string) => {
    return fetchWithAuth(`/whatsapp-analytics/mapping-templates/${id}`, {
      method: "DELETE",
    });
  },

  deactivateContact: async (contactId: string) => {
    return fetchWithAuth(
      `/whatsapp-analytics/contacts/${encodeURIComponent(contactId)}/deactivate`,
      { method: "PATCH" },
    ) as Promise<{ success: boolean; contactId: string }>;
  },
};
