import { fetchWithAuth } from "../../api";

export interface Team {
  id: string;
  name: string;
  description?: string;
  memberCount?: number;
}

export interface TeamMember {
  userId: string;
  role: 'member' | 'lead';
}

export interface InboxSession {
  id: string;
  contactId: string;
  contactName?: string;
  status: 'unassigned' | 'assigned' | 'resolved';
  channel: string;
  lastMessageAt?: string;
  assignedAgentId?: string;
  context?: Record<string, unknown>;
}

export interface Message {
  id: string;
  sessionId: string;
  direction: 'inbound' | 'outbound';
  type: 'text' | 'image' | 'video' | 'audio' | 'document';
  content?: string;
  createdAt: string;
}

export const agentApi = {
  getInbox: async (status?: string) => {
    const query = status ? `?status=${status}` : '';
    return fetchWithAuth(`/agent/inbox${query}`);
  },

  getUnassigned: async (teamId?: string) => {
      const query = teamId ? `?teamId=${teamId}` : '';
      return fetchWithAuth(`/agent/inbox/unassigned${query}`);
  },

  getSession: async (sessionId: string) => {
    return fetchWithAuth(`/agent/inbox/${sessionId}`);
  },

  sendMessage: async (sessionId: string, content: string) => {
    return fetchWithAuth(`/agent/inbox/${sessionId}/message`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
  },

  resolveSession: async (sessionId: string, data: { category: string; notes?: string }) => {
    return fetchWithAuth(`/agent/inbox/${sessionId}/resolve`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
  
  acceptSession: async (sessionId: string) => {
      return fetchWithAuth(`/agent/inbox/${sessionId}/accept`, {
          method: 'POST'
      });
  },

  getTeams: async () => {
    return fetchWithAuth<Team[]>('/agent/teams');
  },

  createTeam: async (name: string, description?: string) => {
    return fetchWithAuth<Team>('/agent/teams', {
      method: 'POST',
      body: JSON.stringify({ name, description }),
    });
  },

  addMember: async (teamId: string, userId: string, role: string = 'member') => {
    return fetchWithAuth(`/agent/teams/${teamId}/members`, {
      method: 'POST',
      body: JSON.stringify({ userId, role }),
    });
  },
  
  getTeamMembers: async (teamId: string) => {
      return fetchWithAuth<TeamMember[]>(`/agent/teams/${teamId}/members`);
  }
};
