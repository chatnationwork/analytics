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

export interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  type: "write" | "read";
  isActive: boolean;
  lastUsedAt: string | null;
  createdAt: string;
}

export const settingsApi = {
  // CRM Integrations
  async getCrmIntegrations(): Promise<CrmIntegration[]> {
    const res = await fetch(`${API_BASE_URL}/api/dashboard/crm-integrations`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error("Failed to fetch CRM integrations");
    const json = await res.json();
    return json.data;
  },

  async createCrmIntegration(data: {
    name: string;
    apiUrl: string;
    apiKey: string;
    webLink?: string;
    csatLink?: string;
    config?: Record<string, any>;
  }): Promise<CrmIntegration> {
    const res = await fetch(`${API_BASE_URL}/api/dashboard/crm-integrations`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to create CRM integration");
    const json = await res.json();
    return json.data;
  },

  async deleteCrmIntegration(id: string): Promise<void> {
    const res = await fetch(
      `${API_BASE_URL}/api/dashboard/crm-integrations/${id}`,
      {
        method: "DELETE",
        headers: getHeaders(),
      },
    );
    if (!res.ok) throw new Error("Failed to delete CRM integration");
  },

  async testCrmConnection(
    id: string,
  ): Promise<{ success: boolean; message: string }> {
    const res = await fetch(
      `${API_BASE_URL}/api/dashboard/crm-integrations/${id}/test`,
      {
        method: "POST",
        headers: getHeaders(),
      },
    );
    if (!res.ok) throw new Error("Failed to test connection");
    const json = await res.json();
    return json.data;
  },

  // API Keys (use fetchWithAuth for cookie auth)
  async getApiKeys(): Promise<ApiKey[]> {
    const { fetchWithAuth } = await import("@/lib/api");
    return fetchWithAuth<ApiKey[]>("/api-keys");
  },

  async generateApiKey(data: {
    name: string;
    type: "write" | "read";
  }): Promise<{ id: string; key: string }> {
    const { fetchWithAuth } = await import("@/lib/api");
    return fetchWithAuth<{ id: string; key: string }>("/api-keys", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async deactivateApiKey(id: string): Promise<{ success: boolean }> {
    const { fetchWithAuth } = await import("@/lib/api");
    return fetchWithAuth<{ success: boolean }>(`/api-keys/${id}/deactivate`, {
      method: "PATCH",
    });
  },
};
