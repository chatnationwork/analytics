import { fetchWithAuth, fetchWithAuthFull } from "../../api";

/** A single configurable field in a team's wrap-up report form */
export interface WrapUpField {
  id: string;
  type: "select" | "text" | "textarea";
  label: string;
  required: boolean;
  placeholder?: string;
  options?: Array<{ value: string; label: string }>;
}

export interface TeamWrapUpReport {
  enabled: boolean;
  mandatory: boolean;
  /** Configurable form fields. When wrap-up is enabled, ResolveDialog renders this form. */
  fields?: WrapUpField[];
}

export interface Team {
  id: string;
  name: string;
  description?: string;
  /** When true, handovers with no teamId use this team's members */
  isDefault?: boolean;
  memberCount?: number;
  schedule?: {
    timezone: string;
    enabled: boolean;
    outOfOfficeMessage?: string;
    outOfOfficeImage?: string;
    days: Record<string, Array<{ start: string; end: string }>>;
  };
  routingStrategy?: string; // 'round_robin' | 'least_active' | 'least_assigned' | 'hybrid'
  routingConfig?: {
    priority?: string[];
    sortBy?: string;
    timeWindow?: string;
    /** Maximum concurrent chats per agent; agents at or above this are excluded from assignment. */
    maxLoad?: number;
  };
  wrapUpReport?: TeamWrapUpReport | null;
}

export interface TeamMember {
  userId: string;
  role: "manager" | "agent" | "member" | "lead";
}

export interface InboxSession {
  id: string;
  contactId: string;
  contactName?: string;
  status: "unassigned" | "assigned" | "resolved";
  channel: string;
  lastMessageAt?: string;
  assignedAgentId?: string;
  assignedTeamId?: string;
  /** Agent/team info when session.view_all (super admin). Populated by backend for tenant inbox. */
  assignedAgent?: { id: string; name?: string } | null;
  assignedTeam?: { id: string; name: string } | null;
  /** Set when the assigned agent has explicitly accepted the chat (required before sending). */
  acceptedAt?: string | null;
  context?: Record<string, unknown>;
  /** When the agent last viewed/sent in this chat. Used for unread indicator. */
  lastReadAt?: string | null;
  /** When the customer last sent a message. Unread when lastInboundMessageAt > lastReadAt. */
  lastInboundMessageAt?: string | null;
}

export interface Message {
  id: string;
  sessionId: string;
  direction: "inbound" | "outbound";
  type:
    | "text"
    | "image"
    | "video"
    | "audio"
    | "document"
    | "location"
    | "template"
    | "interactive"
    | "contacts";
  content?: string;
  /** Media ID, filename, or location coords for non-text messages */
  metadata?: Record<string, unknown>;
  createdAt: string;
  /** Set when sent by an agent from this platform (dashboard); absent for bot/automated outbound. */
  senderId?: string | null;
}

/** Transfer record stored in session.context.transfers (from backend). */
export interface SessionTransfer {
  from?: string;
  to?: string;
  reason?: string;
  timestamp?: string;
  isTakeover?: boolean;
}

/** Payload for sending a message (text, image, video, audio, document, location). */
export interface SendMessagePayload {
  /** Text body (type=text) or caption (image/video/document). Required for text. */
  content?: string;
  type?: "text" | "image" | "video" | "audio" | "document" | "location" | "contacts";
  /** For image/video/audio/document: public URL from our media upload. */
  media_url?: string;
  /** For document: optional filename. */
  filename?: string;
  /** For location. */
  latitude?: number | string;
  longitude?: number | string;
  name?: string;
  address?: string;
  /** For contacts. */
  contacts?: Array<{
    name: {
      formatted_name: string;
      first_name?: string;
      last_name?: string;
    };
    phones?: Array<{
      phone?: string;
      type?: "HOME" | "WORK" | "CELL" | "MAIN" | "IPHONE" | "HOME_FAX" | "WORK_FAX" | "PAGER";
      wa_id?: string;
    }>;
    emails?: Array<{ email?: string; type?: "HOME" | "WORK" }>;
    org?: {
      company?: string;
      department?: string;
      title?: string;
    };
    urls?: Array<{ url?: string; type?: "HOME" | "WORK" }>;
  }>;
}

export interface AvailableAgent {
  id: string;
  name: string;
  email: string;
  /** Tenant membership role (e.g. 'agent'). Returned by the backend for informational use. */
  role?: string;
}

/**
 * Filter types for inbox queries:
 * - 'all': All sessions assigned to the agent
 * - 'pending': Active sessions not resolved (and not expired)
 * - 'resolved': Resolved sessions
 * - 'expired': Sessions with no activity for 24+ hours
 */
export type InboxFilter =
  | "all"
  | "assigned"
  | "unassigned"
  | "pending"
  | "resolved"
  | "expired";

const API_BASE =
  typeof window !== "undefined" ? "" : (process.env.NEXT_PUBLIC_API_URL ?? "");

/**
 * Upload a file to our media server. Returns the public URL to use when sending media (e.g. in sendMessage).
 */
export async function uploadMedia(
  file: File,
): Promise<{ url: string; filename: string }> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`${API_BASE}/api/dashboard/media/upload`, {
    method: "POST",
    body: formData,
    credentials: "include",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message ?? "Upload failed");
  }
  const json = await res.json();
  return (json.data ?? json) as { url: string; filename: string };
}

/** Counts per filter for agent inbox (assigned, active, resolved, expired) */
export interface AgentInboxCounts {
  assigned: number;
  active: number;
  resolved: number;
  expired: number;
}

/** Counts per filter for tenant (admin) inbox */
export interface TenantInboxCounts {
  all: number;
  assigned: number;
  unassigned: number;
  active: number;
  resolved: number;
  expired: number;
}

export const agentApi = {
  /**
   * Get the agent's inbox with optional filter
   */
  getInbox: async (filter?: InboxFilter) => {
    const query = filter ? `?filter=${filter}` : "";
    return fetchWithAuth<InboxSession[]>(`/agent/inbox${query}`);
  },

  /**
   * Get counts per filter for inbox (for filter tab badges).
   * Returns AgentInboxCounts for agents, TenantInboxCounts for admin (session.view_all).
   */
  getInboxCounts: async (): Promise<AgentInboxCounts | TenantInboxCounts> => {
    return fetchWithAuth<AgentInboxCounts | TenantInboxCounts>(
      "/agent/inbox/counts",
    );
  },

  getUnassigned: async (teamId?: string) => {
    const query = teamId ? `?teamId=${teamId}` : "";
    return fetchWithAuth(`/agent/inbox/unassigned${query}`);
  },

  /**
   * Assign queued (unassigned) sessions.
   * Options: mode "auto" (default), "manual" (assignments: { agentId, count }[]), "teams" (teamIds: string[]).
   * Returns { assigned: number }.
   */
  assignQueue: async (options?: {
    teamId?: string;
    mode?: "auto" | "manual" | "teams";
    assignments?: Array<{ agentId: string; count: number }>;
    teamIds?: string[];
  }): Promise<{ assigned: number }> => {
    const query =
      options?.teamId && options?.mode !== "manual" && options?.mode !== "teams"
        ? `?teamId=${encodeURIComponent(options.teamId)}`
        : "";
    const body: {
      mode?: "auto" | "manual" | "teams";
      assignments?: Array<{ agentId: string; count: number }>;
      teamIds?: string[];
    } = {};
    if (options?.mode) body.mode = options.mode;
    if (options?.assignments?.length) body.assignments = options.assignments;
    if (options?.teamIds?.length) body.teamIds = options.teamIds;
    const res = await fetchWithAuthFull<
      { assigned?: number } | { data?: { assigned?: number } }
    >(`/agent/inbox/assign-queue${query}`, {
      method: "POST",
      body: JSON.stringify(body),
    });
    const raw =
      (res as { data?: { assigned?: number } })?.data ??
      (res as { assigned?: number });
    const assigned = typeof raw?.assigned === "number" ? raw.assigned : 0;
    return { assigned };
  },

  /**
   * Teams that have an active shift and at least one member (for assign-queue "teams" option).
   */
  getTeamsAvailableForQueue: async (): Promise<
    Array<{ teamId: string; name: string; memberCount: number }>
  > => {
    return fetchWithAuth("/agent/teams/available-for-queue");
  },

  /**
   * Get session with messages.
   * Backend ResponseInterceptor wraps the controller response in { status, data, timestamp },
   * so the actual body is { data: { session, messages } } and we read from res.data.
   */
  getSession: async (sessionId: string) => {
    const res = await fetchWithAuthFull<{
      data?: { session?: InboxSession; messages?: Message[] };
    }>(`/agent/inbox/${sessionId}`);
    const payload = res?.data ?? {};
    const messages = Array.isArray(payload.messages) ? payload.messages : [];
    const session = payload.session;
    return { session, messages };
  },

  /**
   * Send a message. Pass a string (text) or full payload (image, video, audio, document, location).
   */
  sendMessage: async (
    sessionId: string,
    payload: string | SendMessagePayload,
  ) => {
    const body = typeof payload === "string" ? { content: payload } : payload;
    return fetchWithAuth(`/agent/inbox/${sessionId}/message`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  /**
   * Resolve a session with category/notes (legacy) or wrapUpData (custom fields)
   */
  resolveSession: async (
    sessionId: string,
    data: {
      category?: string;
      notes?: string;
      outcome?: string;
      wrapUpData?: Record<string, string>;
    },
  ) => {
    return fetchWithAuth<InboxSession>(`/agent/inbox/${sessionId}/resolve`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  /**
   * Accept/claim an unassigned session
   */
  acceptSession: async (sessionId: string) => {
    return fetchWithAuth<InboxSession>(`/agent/inbox/${sessionId}/accept`, {
      method: "POST",
      body: JSON.stringify({}),
    });
  },

  /**
   * Send reengagement template message to the contact (for expired chats).
   */
  sendReengagement: async (
    sessionId: string,
  ): Promise<{ success: boolean; messageId?: string }> => {
    return fetchWithAuth(`/agent/inbox/${sessionId}/reengage`, {
      method: "POST",
      body: JSON.stringify({}),
    });
  },

  /**
   * Count of assigned chats inactive for at least olderThanDays (for mass reengagement).
   * Requires session.bulk_transfer permission.
   */
  /**
   * Count of assigned chats inactive for at least olderThanDays (or within custom date range).
   * Requires session.bulk_transfer permission.
   */
  getExpiredCountForReengage: async (
    olderThanDays: number,
    startDate?: string,
    endDate?: string,
  ): Promise<{ count: number }> => {
    const n = Math.max(1, Math.min(365, Math.floor(olderThanDays)));
    const params = new URLSearchParams({ olderThanDays: String(n) });
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);
    return fetchWithAuth(
      `/agent/inbox/reengage/expired-count?${params.toString()}`,
    );
  },

  /**
   * Send reengagement template to all assigned chats inactive for at least olderThanDays days
   * (or within custom date range).
   * Requires session.bulk_transfer permission.
   */
  bulkReengage: async (
    olderThanDays: number,
    startDate?: string,
    endDate?: string,
  ): Promise<{
    sent: number;
    errors: Array<{ sessionId: string; message: string }>;
  }> => {
    const n = Math.max(1, Math.min(365, Math.floor(olderThanDays)));
    return fetchWithAuth("/agent/inbox/reengage/bulk", {
      method: "POST",
      body: JSON.stringify({
        olderThanDays: n,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      }),
    });
  },

  /**
   * Transfer a session to another agent
   */
  transferSession: async (
    sessionId: string,
    targetAgentId: string,
    reason?: string,
  ) => {
    return fetchWithAuth<InboxSession>(`/agent/inbox/${sessionId}/transfer`, {
      method: "POST",
      body: JSON.stringify({ targetAgentId, reason }),
    });
  },

  /**
   * Bulk transfer multiple sessions to one or more agents/teams.
   * Single-target: provide exactly one of targetAgentId or targetTeamId.
   * Multi-target: provide agentAssignments or teamAssignments.
   * Requires session.bulk_transfer permission.
   */
  bulkTransferSessions: async (
    sessionIds: string[],
    options: {
      targetAgentId?: string;
      targetTeamId?: string;
      agentAssignments?: Array<{ agentId: string; count: number }>;
      teamAssignments?: Array<{ teamId: string; count: number }>;
      reason?: string;
      forceOverride?: boolean;
    },
  ): Promise<{
    transferred: number;
    errors: Array<{ sessionId: string; message: string }>;
  }> => {
    const {
      targetAgentId,
      targetTeamId,
      agentAssignments,
      teamAssignments,
      reason,
      forceOverride,
    } = options;

    // Multi-target path
    if (
      (agentAssignments && agentAssignments.length > 0) ||
      (teamAssignments && teamAssignments.length > 0)
    ) {
      return fetchWithAuth("/agent/inbox/transfer/bulk", {
        method: "POST",
        body: JSON.stringify({
          sessionIds,
          ...(agentAssignments ? { agentAssignments } : {}),
          ...(teamAssignments ? { teamAssignments } : {}),
          reason,
          ...(forceOverride ? { forceOverride: true } : {}),
        }),
      });
    }

    // Single-target path (backward compat)
    if (
      (targetAgentId == null || targetAgentId === "") ===
      (targetTeamId == null || targetTeamId === "")
    ) {
      throw new Error("Provide exactly one of targetAgentId or targetTeamId");
    }
    return fetchWithAuth("/agent/inbox/transfer/bulk", {
      method: "POST",
      body: JSON.stringify({
        sessionIds,
        ...(targetAgentId ? { targetAgentId } : {}),
        ...(targetTeamId ? { targetTeamId } : {}),
        reason,
        ...(forceOverride ? { forceOverride: true } : {}),
      }),
    });
  },

  /**
   * Get available agents for transferring a session.
   * When availableOnly is true, only returns agents who are online (available for assignments).
   */
  getAvailableAgents: async (availableOnly?: boolean) => {
    const qs =
      availableOnly === true
        ? "?availableOnly=true"
        : "";
    return fetchWithAuth<AvailableAgent[]>(
      `/agent/inbox/transfer/agents${qs}`,
    );
  },

  /**
   * Get current agent presence and reason (for header status dropdown).
   */
  getPresence: async (): Promise<{
    status: "online" | "offline";
    reason: string | null;
  }> => {
    return fetchWithAuth<{
      status: "online" | "offline";
      reason: string | null;
    }>("/agent/inbox/presence");
  },

  /**
   * Set current agent presence and optional reason (e.g. available, busy, off_shift).
   * "online" = available for assignments, "offline" = not available.
   */
  setPresence: async (
    status: "online" | "offline",
    reason?: string | null,
  ): Promise<
    { sessionId?: string; startedAt?: string } | { endedAt?: string } | null
  > => {
    return fetchWithAuth("/agent/inbox/presence", {
      method: "POST",
      body: JSON.stringify({ status, reason: reason ?? undefined }),
    });
  },

  getTeams: async () => {
    return fetchWithAuth<Team[]>("/agent/teams");
  },

  getQueueStats: async () => {
    return fetchWithAuth<
      Array<{
        teamId: string;
        queueSize: number;
        activeChats: number;
        agentCount: number;
        avgWaitTimeMinutes: number | null;
        longestWaitTimeMinutes: number | null;
        avgResolutionTimeMinutes: number | null;
        longestResolutionTimeMinutes: number | null;
      }>
    >("/agent/teams/queue-stats");
  },

  getTeam: async (teamId: string) => {
    return fetchWithAuth<Team>(`/agent/teams/${teamId}`);
  },

  createTeam: async (
    name: string,
    description?: string,
    wrapUpReport?: TeamWrapUpReport | null,
  ) => {
    return fetchWithAuth<Team>("/agent/teams", {
      method: "POST",
      body: JSON.stringify({ name, description, wrapUpReport }),
    });
  },

  updateTeam: async (teamId: string, data: Partial<Team>) => {
    return fetchWithAuth<Team>(`/agent/teams/${teamId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  addMember: async (
    teamId: string,
    userId: string,
    role: string = "member",
  ) => {
    return fetchWithAuth(`/agent/teams/${teamId}/members`, {
      method: "POST",
      body: JSON.stringify({ userId, role }),
    });
  },

  /** Tenant members available to add to a team (exclude current team members in UI) */
  getAvailableMembersForTeam: async () => {
    return fetchWithAuth<
      {
        userId: string;
        name: string;
        email: string;
        role: string;
        avatarUrl?: string | null;
      }[]
    >("/agent/teams/available-members/list");
  },

  getTeamMembers: async (teamId: string) => {
    return fetchWithAuth<TeamMember[]>(`/agent/teams/${teamId}/members`);
  },

  disableTeam: async (teamId: string) => {
    return fetchWithAuth(`/agent/teams/${teamId}/disable`, {
      method: "PATCH",
      body: JSON.stringify({}),
    });
  },

  setDefaultTeam: async (teamId: string) => {
    return fetchWithAuth(`/agent/teams/${teamId}/set-default`, {
      method: "PATCH",
      body: JSON.stringify({}),
    });
  },

  disableTeamMember: async (teamId: string, userId: string) => {
    return fetchWithAuth(`/agent/teams/${teamId}/members/${userId}/disable`, {
      method: "PATCH",
      body: JSON.stringify({}),
    });
  },

  enableTeamMember: async (teamId: string, userId: string) => {
    return fetchWithAuth(`/agent/teams/${teamId}/members/${userId}/enable`, {
      method: "PATCH",
      body: JSON.stringify({}),
    });
  },

  removeTeamMember: async (teamId: string, userId: string) => {
    return fetchWithAuth(`/agent/teams/${teamId}/members/${userId}`, {
      method: "DELETE",
    });
  },

  /** Contact profile (right panel in inbox) */
  getContactProfile: async (
    contactId: string,
    name?: string,
  ): Promise<ContactProfile> => {
    const q = name ? `?name=${encodeURIComponent(name)}` : "";
    return fetchWithAuth<ContactProfile>(`/agent/contacts/${contactId}${q}`);
  },

  updateContactProfile: async (
    contactId: string,
    data: UpdateContactProfileDto,
  ): Promise<ContactProfile> => {
    return fetchWithAuth<ContactProfile>(`/agent/contacts/${contactId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  searchContacts: async (
    query: string,
    limit?: number,
  ): Promise<ContactProfile[]> => {
    const q = limit != null ? `&limit=${limit}` : "";
    return fetchWithAuth<ContactProfile[]>(`/agent/contacts/search?q=${encodeURIComponent(query)}${q}`);
  },

  getContactNotes: async (
    contactId: string,
    limit?: number,
  ): Promise<ContactNote[]> => {
    const q = limit != null ? `?limit=${limit}` : "";
    return fetchWithAuth<ContactNote[]>(
      `/agent/contacts/${contactId}/notes${q}`,
    );
  },

  addContactNote: async (
    contactId: string,
    content: string,
  ): Promise<ContactNote> => {
    return fetchWithAuth<ContactNote>(`/agent/contacts/${contactId}/notes`, {
      method: "POST",
      body: JSON.stringify({ content }),
    });
  },

  getContactHistory: async (
    contactId: string,
    page?: number,
    limit?: number,
  ): Promise<{ data: ContactHistoryEntry[]; total: number }> => {
    const params = new URLSearchParams();
    if (page != null) params.set("page", String(page));
    if (limit != null) params.set("limit", String(limit));
    const q = params.toString() ? `?${params}` : "";
    const res = await fetchWithAuth<{
      data: ContactHistoryEntry[];
      total: number;
    }>(`/agent/contacts/${contactId}/history${q}`);
    return {
      data: Array.isArray(res?.data) ? res.data : [],
      total: typeof res?.total === "number" ? res.total : 0,
    };
  },

  /** Wrap-up reports (resolutions) for this contact – for the contact card History tab */
  getContactResolutions: async (
    contactId: string,
    page?: number,
    limit?: number,
  ): Promise<{ data: ContactResolution[]; total: number }> => {
    const params = new URLSearchParams();
    if (page != null) params.set("page", String(page));
    if (limit != null) params.set("limit", String(limit));
    const q = params.toString() ? `?${params}` : "";
    const res = await fetchWithAuth<{
      data: ContactResolution[];
      total: number;
    }>(`/agent/contacts/${contactId}/resolutions${q}`);
    return {
      data: Array.isArray(res?.data) ? res.data : [],
      total: typeof res?.total === "number" ? res.total : 0,
    };
  },
};

export interface ContactProfile {
  contactId: string;
  name: string | null;
  pin: string | null;
  yearOfBirth: number | null;
  email: string | null;
  metadata: Record<string, string> | null;
  firstSeen: string;
  lastSeen: string;
  messageCount: number;
}

export interface UpdateContactProfileDto {
  name?: string | null;
  pin?: string | null;
  yearOfBirth?: number | null;
  email?: string | null;
  metadata?: Record<string, string> | null;
}

export interface ContactNote {
  id: string;
  content: string;
  authorId: string;
  authorName: string | null;
  createdAt: string;
}

export interface ContactHistoryEntry {
  id: string;
  action: string;
  actorId: string | null;
  actorName: string | null;
  details: Record<string, unknown> | null;
  createdAt: string;
}

/** A single wrap-up report (resolution) for a contact's past session */
export interface ContactResolution {
  id: string;
  sessionId: string;
  category: string;
  outcome: string;
  notes: string | null;
  formData: Record<string, string | number | boolean> | null;
  resolvedByAgentId: string;
  resolvedByAgentName: string | null;
  createdAt: string;
}

export interface Role {
  id: string;
  name: string;
  description?: string;
  isSystem: boolean;
  tenantId?: string;
  permissions: string[];
}

export const roleApi = {
  getRoles: async (tenantId?: string) => {
    return fetchWithAuth<Role[]>("/settings/roles", {
      headers: tenantId ? { "x-tenant-id": tenantId } : {},
    });
  },

  getPermissions: async (tenantId?: string) => {
    return fetchWithAuth<string[]>("/settings/roles/permissions", {
      headers: tenantId ? { "x-tenant-id": tenantId } : {},
    });
  },

  createRole: async (
    data: { name: string; description?: string; permissions: string[] },
    tenantId?: string,
  ) => {
    return fetchWithAuth<Role>("/settings/roles", {
      method: "POST",
      body: JSON.stringify(data),
      headers: tenantId ? { "x-tenant-id": tenantId } : {},
    });
  },

  updateRole: async (
    id: string,
    data: { name?: string; description?: string; permissions?: string[] },
    tenantId?: string,
  ) => {
    return fetchWithAuth<Role>(`/settings/roles/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
      headers: tenantId ? { "x-tenant-id": tenantId } : {},
    });
  },

  deleteRole: async (id: string, tenantId?: string) => {
    return fetchWithAuth(`/settings/roles/${id}`, {
      method: "DELETE",
      headers: tenantId ? { "x-tenant-id": tenantId } : {},
    });
  },
};
