
const API_BASE_URL = ''; // Relative path for proxy

const getHeaders = () => {
  return {
    'Content-Type': 'application/json',
  };
};

export interface CrmIntegration {
  id: string;
  name: string;
  apiUrl: string;
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
  type: 'write' | 'read';
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
    if (!res.ok) throw new Error('Failed to fetch CRM integrations');
    const json = await res.json();
    return json.data;
  },

  async createCrmIntegration(data: { name: string; apiUrl: string; apiKey: string; config?: Record<string, any> }): Promise<CrmIntegration> {
    const res = await fetch(`${API_BASE_URL}/api/dashboard/crm-integrations`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to create CRM integration');
    const json = await res.json();
    return json.data;
  },

  async deleteCrmIntegration(id: string): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/api/dashboard/crm-integrations/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to delete CRM integration');
  },

  async testCrmConnection(id: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE_URL}/api/dashboard/crm-integrations/${id}/test`, {
      method: 'POST',
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to test connection');
    const json = await res.json();
    return json.data;
  },

  // API Keys
  async getApiKeys(): Promise<ApiKey[]> {
    const res = await fetch(`${API_BASE_URL}/api/dashboard/api-keys`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch API keys');
    const json = await res.json();
    return json.data;
  },

  async generateApiKey(data: { name: string; type: 'write' | 'read' }): Promise<{ id: string; key: string }> {
    const res = await fetch(`${API_BASE_URL}/api/dashboard/api-keys`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to generate API key');
    const json = await res.json();
    return json.data;
  },

  async revokeApiKey(id: string): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/api/dashboard/api-keys/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to revoke API key');
  },
};
