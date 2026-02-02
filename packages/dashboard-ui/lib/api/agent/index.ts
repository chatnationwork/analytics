import { fetchWithAuth } from "../../api";

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
  memberCount?: number;
  schedule?: {
    timezone: string;
    enabled: boolean;
    outOfOfficeMessage?: string;
    days: Record<string, Array<{ start: string; end: string }>>;
  };
  routingStrategy?: string; // 'round_robin' | 'least_active' | 'least_assigned' | 'hybrid'
  routingConfig?: {
    priority: string[];
    sortBy?: string;
    timeWindow?: string;
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
  context?: Record<string, unknown>;
}

export interface Message {
  id: string;
  sessionId: string;
  direction: "inbound" | "outbound";
  type: "text" | "image" | "video" | "audio" | "document";
  content?: string;
  createdAt: string;
}

export interface AvailableAgent {
  id: string;
  name: string;
  email: string;
}

/**
 * Filter types for inbox queries:
 * - 'all': All sessions assigned to the agent
 * - 'pending': Active sessions not resolved (and not expired)
 * - 'resolved': Resolved sessions
 * - 'expired': Sessions with no activity for 24+ hours
 */
export type InboxFilter = "all" | "pending" | "resolved" | "expired";

export const agentApi = {
  /**
   * Get the agent's inbox with optional filter
   */
  getInbox: async (filter?: InboxFilter) => {
    const query = filter ? `?filter=${filter}` : "";
    return fetchWithAuth<InboxSession[]>(`/agent/inbox${query}`);
  },

  getUnassigned: async (teamId?: string) => {
    const query = teamId ? `?teamId=${teamId}` : "";
    return fetchWithAuth(`/agent/inbox/unassigned${query}`);
  },

  getSession: async (sessionId: string) => {
    return fetchWithAuth(`/agent/inbox/${sessionId}`);
  },

  sendMessage: async (sessionId: string, content: string) => {
    return fetchWithAuth(`/agent/inbox/${sessionId}/message`, {
      method: "POST",
      body: JSON.stringify({ content }),
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
   * Get available agents for transferring a session
   */
  getAvailableAgents: async () => {
    return fetchWithAuth<AvailableAgent[]>("/agent/inbox/transfer/agents");
  },

  getTeams: async () => {
    return fetchWithAuth<Team[]>("/agent/teams");
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

  getTeamMembers: async (teamId: string) => {
    return fetchWithAuth<TeamMember[]>(`/agent/teams/${teamId}/members`);
  },

  disableTeam: async (teamId: string) => {
    return fetchWithAuth(`/agent/teams/${teamId}/disable`, {
      method: "PATCH",
    });
  },

  disableTeamMember: async (teamId: string, userId: string) => {
    return fetchWithAuth(`/agent/teams/${teamId}/members/${userId}/disable`, {
      method: "PATCH",
    });
  },

  enableTeamMember: async (teamId: string, userId: string) => {
    return fetchWithAuth(`/agent/teams/${teamId}/members/${userId}/enable`, {
      method: "PATCH",
    });
  },

  removeTeamMember: async (teamId: string, userId: string) => {
    return fetchWithAuth(`/agent/teams/${teamId}/members/${userId}`, {
      method: "DELETE",
    });
  },
};

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
