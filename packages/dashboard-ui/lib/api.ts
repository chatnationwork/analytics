const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

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

export const api = {
  /**
   * Fetch overview KPIs
   */
  async getOverview(tenantId = 'default-tenant', startDate?: string, endDate?: string): Promise<OverviewData> {
    const params = new URLSearchParams({ tenantId });
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);

    const res = await fetch(`${API_BASE_URL}/api/dashboard/overview?${params}`);
    if (!res.ok) throw new Error('Failed to fetch overview');
    return res.json();
  },

  /**
   * Analyze a funnel with custom steps
   */
  async analyzeFunnel(
    steps: { name: string; eventName: string }[],
    startDate: string,
    endDate: string,
    tenantId = 'default-tenant'
  ): Promise<FunnelResponse> {
    const res = await fetch(`${API_BASE_URL}/api/dashboard/funnel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ steps, startDate, endDate, tenantId }),
    });
    if (!res.ok) throw new Error('Failed to analyze funnel');
    return res.json();
  },

  /**
   * Get top events by count (for auto-building funnels)
   */
  async getTopEvents(tenantId = 'default-tenant', limit = 10): Promise<EventCount[]> {
    const params = new URLSearchParams({ tenantId, limit: String(limit) });
    const res = await fetch(`${API_BASE_URL}/api/dashboard/events/top?${params}`);
    if (!res.ok) throw new Error('Failed to fetch top events');
    return res.json();
  },

  /**
   * Fetch sessions list
   */
  async getSessions(tenantId = 'default-tenant', page = 1, limit = 20): Promise<{ sessions: any[]; total: number }> {
    const params = new URLSearchParams({ tenantId, page: String(page), limit: String(limit) });
    const res = await fetch(`${API_BASE_URL}/api/dashboard/sessions?${params}`);
    if (!res.ok) throw new Error('Failed to fetch sessions');
    return res.json();
  },

  /**
   * Fetch events list
   */
  async getEvents(tenantId = 'default-tenant', startDate?: string, endDate?: string, limit = 100): Promise<any[]> {
    const params = new URLSearchParams({ tenantId, limit: String(limit) });
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);

    const res = await fetch(`${API_BASE_URL}/api/dashboard/events?${params}`);
    if (!res.ok) throw new Error('Failed to fetch events');
    return res.json();
  },

  /**
   * Fetch distinct event names
   */
  async getDistinctEvents(tenantId = 'default-tenant'): Promise<string[]> {
    const params = new URLSearchParams({ tenantId });
    const res = await fetch(`${API_BASE_URL}/api/dashboard/events/distinct?${params}`);
    if (!res.ok) throw new Error('Failed to fetch distinct events');
    return res.json();
  },
};
