/**
 * API base URL for fetch calls.
 * - In the browser: always use "" (same origin) so the auth cookie is sent to our Next.js
 *   proxy, which then forwards to the backend with the token. If we used a different origin
 *   (e.g. NEXT_PUBLIC_API_URL=http://localhost:3001 while the app is on :3002), the cookie
 *   would not be sent and every request would get 401 in local.
 * - On the server: use NEXT_PUBLIC_API_URL or "" (server-side auth uses SERVER_API_URL elsewhere).
 */
function getApiBaseUrl(): string {
  if (typeof window !== "undefined") return "";
  const env = process.env.NEXT_PUBLIC_API_URL ?? "";
  return env;
}

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
  const res = await fetch(`${getApiBaseUrl()}/api/dashboard${url}`, {
    ...options,
    credentials: "include",
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
  const res = await fetch(`${getApiBaseUrl()}/api/dashboard${url}`, {
    ...options,
    credentials: "include",
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

/**
 * Fetch and return a Blob (for file downloads).
 */
export async function fetchBlobWithAuth(
  url: string,
  options: RequestInit = {},
): Promise<Blob> {
  const res = await fetch(`${getApiBaseUrl()}/api/dashboard${url}`, {
    ...options,
    credentials: "include",
    headers: {
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
    throw new Error(errorData.message || `Failed to fetch blob ${url}`);
  }

  return res.blob();
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
   * Analyze a funnel with custom steps.
   * When useJourneyFlags is true, first step = sessions with journeyStart, last step = sessions with journeyEnd.
   */
  async analyzeFunnel(
    steps: { name: string; eventName: string }[],
    startDate: string,
    endDate: string,
    tenantId?: string,
    useJourneyFlags?: boolean,
  ): Promise<FunnelResponse> {
    return fetchWithAuth<FunnelResponse>("/funnel", {
      method: "POST",
      body: JSON.stringify({
        steps,
        startDate,
        endDate,
        tenantId,
        useJourneyFlags: useJourneyFlags === true,
      }),
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
   * Get current tenant context (includes settings e.g. navLabels).
   */
  async getCurrentTenant(): Promise<{
    tenantId: string;
    name: string;
    slug: string;
    plan?: string;
    role?: string;
    settings?: { navLabels?: Record<string, string> } & Record<string, unknown>;
  }> {
    return fetchWithAuth("/tenants/current");
  },

  /**
   * Change password (current session). Returns new accessToken and user; caller should set session cookie and update auth state.
   */
  async changePassword(
    currentPassword: string,
    newPassword: string,
  ): Promise<{
    accessToken: string;
    tokenType: string;
    expiresIn: number;
    user: {
      id: string;
      email: string;
      name: string;
      tenantId: string;
      permissions: { global: string[]; team: Record<string, string[]> };
    };
  }> {
    const res = await fetchWithAuthFull<{
      data?: {
        accessToken: string;
        tokenType: string;
        expiresIn: number;
        user: {
          id: string;
          email: string;
          name: string;
          tenantId: string;
          permissions: { global: string[]; team: Record<string, string[]> };
        };
      };
      accessToken?: string;
      expiresIn?: number;
      user?: {
        id: string;
        email: string;
        name: string;
        tenantId: string;
        permissions: { global: string[]; team: Record<string, string[]> };
      };
    }>("/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const data = res.data ?? res;
    const accessToken = data.accessToken;
    const user = data.user;
    const expiresIn = data.expiresIn ?? 60 * 60 * 24 * 7;
    if (!accessToken || !user) {
      throw new Error("Invalid change-password response");
    }
    return {
      accessToken,
      tokenType: data.tokenType ?? "Bearer",
      expiresIn,
      user,
    };
  },

  /**
   * Get current user's 2FA status (masked phone).
   */
  async get2FaStatus(): Promise<{
    twoFactorEnabled: boolean;
    phone: string | null;
  }> {
    const res = await fetchWithAuthFull<{
      data?: { twoFactorEnabled: boolean; phone: string | null };
      twoFactorEnabled?: boolean;
      phone?: string | null;
    }>("/auth/2fa/status");
    return (
      res.data ?? {
        twoFactorEnabled: !!res.twoFactorEnabled,
        phone: res.phone ?? null,
      }
    );
  },

  /**
   * Enable or disable 2FA and set phone. Phone required when enabling.
   */
  async update2Fa(body: {
    twoFactorEnabled?: boolean;
    phone?: string;
  }): Promise<{ twoFactorEnabled: boolean; phone: string | null }> {
    const res = await fetchWithAuthFull<{
      data?: { twoFactorEnabled: boolean; phone: string | null };
      twoFactorEnabled?: boolean;
      phone?: string | null;
    }>("/auth/2fa", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return (
      res.data ?? {
        twoFactorEnabled: !!res.twoFactorEnabled,
        phone: res.phone ?? null,
      }
    );
  },

  /**
   * Update current tenant settings (merged with existing on backend).
   */
  async updateTenantSettings(
    settings: {
      navLabels?: Record<string, string>;
    } & Record<string, unknown>,
  ): Promise<{ settings?: Record<string, unknown> }> {
    return fetchWithAuth("/tenants/current", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ settings }),
    });
  },

  /**
   * List current tenant members (with inviter info and active status)
   */
  async getTenantMembers(): Promise<
    {
      userId: string;
      name: string | null;
      email: string;
      role: string;
      joinedAt: string;
      isActive: boolean;
      avatarUrl?: string | null;
      invitedBy?: string;
      invitedByName?: string | null;
    }[]
  > {
    return fetchWithAuth("/tenants/current/members");
  },

  /**
   * Update a member's role
   */
  async updateMemberRole(
    userId: string,
    role: string,
  ): Promise<{ userId: string; role: string }> {
    return fetchWithAuth(`/tenants/current/members/${userId}`, {
      method: "PATCH",
      body: JSON.stringify({ role }),
    });
  },

  /**
   * Deactivate a member (revoke access; they remain in the list and can be reactivated).
   */
  async deactivateMember(userId: string): Promise<{
    success: boolean;
    isActive: boolean;
  }> {
    return fetchWithAuth(`/tenants/current/members/${userId}/deactivate`, {
      method: "PATCH",
    });
  },

  /**
   * Reactivate a deactivated member.
   */
  async reactivateMember(userId: string): Promise<{
    success: boolean;
    isActive: boolean;
  }> {
    return fetchWithAuth(`/tenants/current/members/${userId}/reactivate`, {
      method: "PATCH",
    });
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
