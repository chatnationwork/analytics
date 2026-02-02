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

/** Row shape for live event stream (GET /events/recent) */
export interface LiveEventRow {
  eventId: string;
  eventName: string;
  eventType?: string;
  timestamp: string;
  sessionId: string;
  userId?: string;
  anonymousId?: string;
  pagePath?: string;
  properties?: Record<string, unknown>;
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

  // Dispatch event for UI to handle (e.g. show modal)
  window.dispatchEvent(new CustomEvent("auth:expired", { detail: { reason } }));

  // Mark that we're redirecting (prevents repeated calls if multiple 401s occur)
  sessionStorage.setItem("auth_redirect_time", Date.now().toString());

  // REMOVED: Fallback setTimeout(() => logout(reason), 2000);
  // We rely on the SessionExpiredDialog to handle the logout/login flow.
  // Auto-redirecting here causes a reload loop if the user is already on a page triggering 401s.
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

/**
 * Same as fetchWithAuth but returns the full response body (not only json.data).
 * Use for endpoints that return pagination or multiple top-level fields.
 */
export async function fetchWithAuthFull<T = unknown>(
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
    const errorData = await res.json().catch(() => ({}));
    if (res.status === 401 && shouldRedirectOn401()) {
      const reason: LogoutReason = errorData.message
        ?.toLowerCase?.()
        .includes("revoked")
        ? "revoked"
        : "expired";
      scheduleAuthRedirect(reason);
    }
    throw new Error(errorData.message || `Failed to fetch ${url}`);
  }

  return res.json();
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
   * Get recent events for the live event stream (polling).
   * Tenant is taken from auth; no need to pass.
   */
  async getRecentEvents(
    sinceMinutes = 60,
    limit = 200,
    eventName?: string,
  ): Promise<{ events: LiveEventRow[] }> {
    const params = new URLSearchParams({
      sinceMinutes: String(sinceMinutes),
      limit: String(limit),
    });
    if (eventName) params.set("eventName", eventName);
    return fetchWithAuth<{ events: LiveEventRow[] }>(
      `/events/recent?${params}`,
    );
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

  /**
   * Search for users by userId, anonymousId, phone, or email
   */
  async searchUsers(
    query: string,
    tenantId?: string,
    limit = 10,
  ): Promise<{
    users: {
      id: string;
      type: "userId" | "anonymousId";
      totalSessions: number;
      totalEvents: number;
      firstSeen: string;
      lastSeen: string;
    }[];
  }> {
    const params = new URLSearchParams({ q: query, limit: String(limit) });
    if (tenantId) params.set("tenantId", tenantId);
    return fetchWithAuth(`/sessions/search?${params}`);
  },

  /**
   * Get the complete journey for a user
   */
  async getUserJourney(
    id: string,
    type: "userId" | "anonymousId",
    tenantId?: string,
    limit = 500,
  ): Promise<{
    user: {
      id: string;
      type: "userId" | "anonymousId";
      totalSessions: number;
      totalEvents: number;
      firstSeen: string | null;
      lastSeen: string | null;
    };
    sessions: {
      sessionId: string;
      startedAt: string;
      endedAt: string | null;
      durationSeconds: number;
      eventCount: number;
      deviceType: string | null;
      entryPage: string | null;
      converted: boolean;
    }[];
    events: {
      eventId: string;
      eventName: string;
      timestamp: string;
      sessionId: string;
      channelType: string | null;
      pagePath: string | null;
      properties: Record<string, unknown> | null;
    }[];
  }> {
    const params = new URLSearchParams({ type, limit: String(limit) });
    if (tenantId) params.set("tenantId", tenantId);
    return fetchWithAuth(
      `/sessions/journey/${encodeURIComponent(id)}?${params}`,
    );
  },
};
