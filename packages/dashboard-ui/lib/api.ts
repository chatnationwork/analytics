import { authClient } from './auth-client';

const API_BASE_URL = ''; // Relative path for proxy

interface OverviewData {
  totalSessions: number;
  totalUsers: number;
  conversionRate: number;
  avgSessionDuration: number;
}

interface FunnelStep {
  name: string;
  eventName: string;
  count: number;
  percent: number;
}

interface FunnelResponse {
  steps: FunnelStep[];
}

interface EventCount {
  eventName: string;
  count: number;
}

const getHeaders = () => {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  const token = authClient.getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

export const api = {
  /**
   * Fetch overview KPIs
   */
  async getOverview(tenantId?: string, startDate?: string, endDate?: string): Promise<OverviewData> {
    const params = new URLSearchParams();
    if (tenantId) params.set('tenantId', tenantId);
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);

    const res = await fetch(`${API_BASE_URL}/api/dashboard/overview?${params}`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch overview');
    const json = await res.json();
    return json.data; // Wrapper unwrapping handled here
  },

  /**
   * Analyze a funnel with custom steps
   */
  async analyzeFunnel(
    steps: { name: string; eventName: string }[],
    startDate: string,
    endDate: string,
    tenantId?: string
  ): Promise<FunnelResponse> {
    const res = await fetch(`${API_BASE_URL}/api/dashboard/funnel`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ steps, startDate, endDate, tenantId }),
    });
    if (!res.ok) throw new Error('Failed to analyze funnel');
    const json = await res.json();
    return json.data;
  },

  /**
   * Get top events by count (for auto-building funnels)
   */
  async getTopEvents(tenantId?: string, limit = 10): Promise<EventCount[]> {
    const params = new URLSearchParams({ limit: String(limit) });
    if (tenantId) params.set('tenantId', tenantId);

    const res = await fetch(`${API_BASE_URL}/api/dashboard/events/top?${params}`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch top events');
    const json = await res.json();
    return json.data;
  },

  /**
   * Fetch sessions list
   */
  async getSessions(tenantId?: string, page = 1, limit = 20): Promise<{ sessions: any[]; total: number }> {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (tenantId) params.set('tenantId', tenantId);

    const res = await fetch(`${API_BASE_URL}/api/dashboard/sessions?${params}`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch sessions');
    const json = await res.json();
    return json.data;
  },

  /**
   * Fetch events list
   */
  async getEvents(tenantId?: string, startDate?: string, endDate?: string, limit = 100): Promise<any[]> {
    const params = new URLSearchParams({ limit: String(limit) });
    if (tenantId) params.set('tenantId', tenantId);
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);

    const res = await fetch(`${API_BASE_URL}/api/dashboard/events?${params}`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch events');
    const json = await res.json();
    return json.data;
  },

  /**
   * Fetch distinct event names
   */
  async getDistinctEvents(tenantId?: string): Promise<string[]> {
    const params = new URLSearchParams();
    if (tenantId) params.set('tenantId', tenantId);
    
    const res = await fetch(`${API_BASE_URL}/api/dashboard/events/distinct?${params}`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch distinct events');
    const json = await res.json();
    return json.data;
  },
};
