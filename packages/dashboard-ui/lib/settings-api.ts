const API_BASE_URL = ""; // Relative path for proxy

const getHeaders = () => {
  return {
    "Content-Type": "application/json",
  };
};

export interface CrmIntegration {
  id: string;
  name: string;
  apiUrl: string;
  /** Link to this CRM's webview base pages (for sending users to webview) */
  webLink: string | null;
  /** CSAT survey link sent when chat is resolved. If not set, uses webLink + '/csat'. */
  csatLink: string | null;
  isActive: boolean;
  config: Record<string, any> | null;
  lastConnectedAt: string | null;
  lastError: string | null;
  createdAt: string;
}

export const settingsApi = {
  // CRM Integrations (use fetchWithAuth so cookies are sent and 401 is handled)
  async getCrmIntegrations(): Promise<CrmIntegration[]> {
    const { fetchWithAuth } = await import("@/lib/api");
    return fetchWithAuth<CrmIntegration[]>("/crm-integrations");
  },

  async createCrmIntegration(data: {
    name: string;
    apiUrl: string;
    apiKey: string;
    webLink?: string;
    csatLink?: string;
    config?: Record<string, unknown>;
  }): Promise<CrmIntegration> {
    const { fetchWithAuth } = await import("@/lib/api");
    return fetchWithAuth<CrmIntegration>("/crm-integrations", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async deleteCrmIntegration(id: string): Promise<void> {
    const res = await fetch(
      `${API_BASE_URL}/api/dashboard/crm-integrations/${id}`,
      {
        method: "DELETE",
        headers: getHeaders(),
        credentials: "include",
      },
    );
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const msg =
        err?.message ?? err?.error ?? "Failed to delete CRM integration";
      throw new Error(
        typeof msg === "string" ? msg : "Failed to delete CRM integration",
      );
    }
  },

  async testCrmConnection(
    id: string,
  ): Promise<{ success: boolean; message: string }> {
    const { fetchWithAuth } = await import("@/lib/api");
    return fetchWithAuth<{ success: boolean; message: string }>(
      `/crm-integrations/${id}/test`,
    );
  },
};

