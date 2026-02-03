/**
 * Agent status viewership API – list agents (online/offline), session history with metrics.
 */

import { fetchWithAuthFull } from "./api";

export interface AgentStatusItem {
  agentId: string;
  name: string | null;
  email: string;
  status: string;
  currentSessionStartedAt: string | null;
  lastSessionEndedAt: string | null;
}

export interface AgentSessionWithMetrics {
  id: string;
  agentId: string;
  agentName: string | null;
  startedAt: string;
  endedAt: string | null;
  durationMinutes: number | null;
  chatsReceived: number;
  chatsResolved: number;
}

/** Backend wraps all responses in { status, data, timestamp } */
interface Wrapped<T> {
  data: T;
}

export const agentStatusApi = {
  /** Set another agent's presence (online/offline). Caller must be a tenant member (e.g. admin). */
  setPresence: async (
    targetUserId: string,
    status: "online" | "offline",
  ): Promise<void> => {
    await fetchWithAuthFull("/agent/status/presence", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetUserId, status }),
    });
  },

  getAgentStatusList: async (): Promise<AgentStatusItem[]> => {
    const res =
      await fetchWithAuthFull<Wrapped<AgentStatusItem[]>>("/agent/status");
    return (
      (res as Wrapped<AgentStatusItem[]>).data ??
      (res as unknown as AgentStatusItem[])
    );
  },

  getSessionHistory: async (params?: {
    agentId?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }) => {
    const search = new URLSearchParams();
    if (params?.agentId) search.set("agentId", params.agentId);
    if (params?.startDate) search.set("startDate", params.startDate);
    if (params?.endDate) search.set("endDate", params.endDate);
    if (params?.page != null) search.set("page", String(params.page));
    if (params?.limit != null) search.set("limit", String(params.limit));
    const q = search.toString();
    const res = await fetchWithAuthFull<
      Wrapped<{
        data: AgentSessionWithMetrics[];
        total: number;
        page: number;
        limit: number;
      }>
    >(`/agent/status/sessions${q ? `?${q}` : ""}`);
    const body = (
      res as Wrapped<{
        data: AgentSessionWithMetrics[];
        total: number;
        page: number;
        limit: number;
      }>
    ).data;
    return (
      body ??
      (res as unknown as {
        data: AgentSessionWithMetrics[];
        total: number;
        page: number;
        limit: number;
      })
    );
  },
};
