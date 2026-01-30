import { fetchWithAuth } from "../../api";

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
   * Resolve a session with category and optional notes
   */
  resolveSession: async (
    sessionId: string,
    data: { category: string; notes?: string; outcome?: string },
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

  createTeam: async (name: string, description?: string) => {
    return fetchWithAuth<Team>("/agent/teams", {
      method: "POST",
      body: JSON.stringify({ name, description }),
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
