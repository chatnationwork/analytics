const API_BASE_URL = ""; // Relative path for proxy

interface OverviewData {
  totalSessions: number;
  totalUsers: number;
  conversionRate: number;
  avgSessionDuration: number;
  dailySessions: { date: string; count: number }[];
  deviceBreakdown: { device: string; count: number }[];
  heatmap: { day: number; hour: number; count: number }[];
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
  return {
    "Content-Type": "application/json",
  };
};

/**
 * Logout reasons for the login page to display appropriate messages
 */
type LogoutReason = "expired" | "revoked" | "idle" | "unauthorized";

/**
 * Redirect to login page with a reason.
 */
export const logout = (reason?: LogoutReason) => {
  if (typeof window !== "undefined") {
    const params = reason ? `?reason=${reason}` : "";
    window.location.href = `/login${params}`;
  }
};

/**
 * Track if a 401 redirect is already scheduled to prevent infinite loops.
 * Uses sessionStorage so it persists through the redirect but clears on new sessions.
 */
function shouldRedirectOn401(): boolean {
  if (typeof window === "undefined") return false;

  // Don't redirect if already on login page
  if (window.location.pathname === "/login") return false;

  // Check if we've already scheduled a redirect (within last 5 seconds)
  const lastRedirect = sessionStorage.getItem("auth_redirect_time");
  if (lastRedirect) {
    const elapsed = Date.now() - parseInt(lastRedirect, 10);
    if (elapsed < 5000) return false; // Skip if redirected within 5 seconds
  }

  return true;
}

function scheduleAuthRedirect(reason: LogoutReason): void {
  if (typeof window === "undefined") return;

  // Mark that we're redirecting
  sessionStorage.setItem("auth_redirect_time", Date.now().toString());

  // Use setTimeout to batch multiple 401s and only redirect once
  setTimeout(() => {
    logout(reason);
  }, 100);
}

export async function fetchWithAuth<T = any>(
  url: string,
  options: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${API_BASE_URL}/api/dashboard${url}`, {
    ...options,
    headers: {
      ...getHeaders(),
      ...options.headers,
    },
  });

  if (!res.ok) {
    // Try to get error message from response
    const errorData = await res.json().catch(() => ({}));

    // Handle 401 - schedule redirect to login
    if (res.status === 401) {
      if (shouldRedirectOn401()) {
        // Determine reason from error message
        let reason: LogoutReason = "expired";
        if (errorData.message?.toLowerCase().includes("revoked")) {
          reason = "revoked";
        }
        scheduleAuthRedirect(reason);
      }
      throw new Error("Session expired");
    }

    throw new Error(errorData.message || `Failed to fetch ${url}`);
  }

  const json = await res.json();
  return json.data;
}

export const api = {
  /**
   * Fetch overview KPIs
   */
  async getOverview(
    tenantId?: string,
    startDate?: string,
    endDate?: string,
  ): Promise<OverviewData> {
    const params = new URLSearchParams();
    if (tenantId) params.set("tenantId", tenantId);
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);

    return fetchWithAuth<OverviewData>(`/overview?${params}`);
  },

  /**
   * Analyze a funnel with custom steps
   */
  async analyzeFunnel(
    steps: { name: string; eventName: string }[],
    startDate: string,
    endDate: string,
    tenantId?: string,
  ): Promise<FunnelResponse> {
    return fetchWithAuth<FunnelResponse>("/funnel", {
      method: "POST",
      body: JSON.stringify({ steps, startDate, endDate, tenantId }),
    });
  },

  /**
   * Get top events by count (for auto-building funnels)
   */
  async getTopEvents(tenantId?: string, limit = 10): Promise<EventCount[]> {
    const params = new URLSearchParams({ limit: String(limit) });
    if (tenantId) params.set("tenantId", tenantId);

    return fetchWithAuth<EventCount[]>(`/events/top?${params}`);
  },

  /**
   * Fetch sessions list
   */
  async getSessions(
    tenantId?: string,
    page = 1,
    limit = 20,
  ): Promise<{ sessions: any[]; total: number }> {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
    });
    if (tenantId) params.set("tenantId", tenantId);

    return fetchWithAuth<{ sessions: any[]; total: number }>(
      `/sessions?${params}`,
    );
  },

  /**
   * Fetch events list
   */
  async getEvents(
    tenantId?: string,
    startDate?: string,
    endDate?: string,
    limit = 100,
  ): Promise<any[]> {
    const params = new URLSearchParams({ limit: String(limit) });
    if (tenantId) params.set("tenantId", tenantId);
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);

    return fetchWithAuth<any[]>(`/events?${params}`);
  },

  /**
   * Fetch distinct event names
   */
  async getDistinctEvents(tenantId?: string): Promise<string[]> {
    const params = new URLSearchParams();
    if (tenantId) params.set("tenantId", tenantId);

    return fetchWithAuth<string[]>(`/events/distinct?${params}`);
  },

  /**
   * Fetch top page paths for "Traffic by Journey" chart
   */
  async getTopPagePaths(
    tenantId?: string,
    startDate?: string,
    endDate?: string,
  ): Promise<{ pagePath: string; count: number; uniqueSessions: number }[]> {
    const params = new URLSearchParams();
    if (tenantId) params.set("tenantId", tenantId);
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);

    return fetchWithAuth<
      { pagePath: string; count: number; uniqueSessions: number }[]
    >(`/overview/page-paths?${params}`);
  },

  /**
   * Get current tenant context
   */
  async getCurrentTenant(): Promise<{
    tenantId: string;
    name: string;
    slug: string;
  }> {
    return fetchWithAuth("/tenants/current");
  },
};
