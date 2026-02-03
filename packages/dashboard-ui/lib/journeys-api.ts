/**
 * =============================================================================
 * JOURNEYS ANALYTICS API CLIENT
 * =============================================================================
 *
 * Frontend API client for self-serve vs assisted journey analytics.
 */

import { fetchWithAuth } from "./api";

// Response interfaces

export interface JourneyOverviewResponse {
  totalSessions: number;
  selfServeSessions: number;
  assistedSessions: number;
  selfServeRate: number;
  assistedRate: number;
  selfServeChange: number;
  assistedChange: number;
  startDate: string;
  endDate: string;
  granularity: string;
}

export interface HandoffTrendDataPoint {
  period: string;
  totalSessions: number;
  selfServe: number;
  assisted: number;
  handoffRate: number;
  selfServeRate: number;
}

export interface HandoffTrendResponse {
  data: HandoffTrendDataPoint[];
  summary: {
    totalSessions: number;
    totalHandoffs: number;
    avgHandoffRate: number;
    percentChange: number;
  };
  startDate: string;
  endDate: string;
  granularity: string;
}

export interface HandoffByStepItem {
  step: string;
  handoffs: number;
  percentage: number;
}

export interface HandoffByStepResponse {
  data: HandoffByStepItem[];
  summary: {
    totalHandoffs: number;
    uniqueSteps: number;
  };
  startDate: string;
  endDate: string;
}

export interface HandoffReasonItem {
  reason: string;
  count: number;
  percentage: number;
}

export interface HandoffReasonsResponse {
  data: HandoffReasonItem[];
  summary: {
    totalHandoffs: number;
  };
  startDate: string;
  endDate: string;
}

export interface TimeToHandoffResponse {
  avgSeconds: number;
  medianSeconds: number;
  p95Seconds: number;
  handoffCount: number;
  avgFormatted: string;
  medianFormatted: string;
  p95Formatted: string;
  startDate: string;
  endDate: string;
}

export interface AgentPerformanceItem {
  agentId: string;
  totalHandoffs: number;
  uniqueSessions: number;
}

export interface AgentPerformanceResponse {
  data: AgentPerformanceItem[];
  summary: {
    totalHandoffs: number;
    totalAgents: number;
    avgHandoffsPerAgent: number;
  };
  startDate: string;
  endDate: string;
}

// API functions

export async function getJourneyOverview(
  granularity: "day" | "week" | "month" = "day",
  periods: number = 30,
): Promise<JourneyOverviewResponse> {
  return fetchWithAuth(
    `/journeys/overview?granularity=${granularity}&periods=${periods}`,
  );
}

export async function getHandoffTrend(
  granularity: "day" | "week" | "month" = "day",
  periods: number = 30,
): Promise<HandoffTrendResponse> {
  return fetchWithAuth(
    `/journeys/trends/handoff?granularity=${granularity}&periods=${periods}`,
  );
}

export async function getHandoffByStep(
  granularity: "day" | "week" | "month" = "day",
  periods: number = 30,
): Promise<HandoffByStepResponse> {
  return fetchWithAuth(
    `/journeys/handoff-by-step?granularity=${granularity}&periods=${periods}`,
  );
}

export async function getHandoffReasons(
  granularity: "day" | "week" | "month" = "day",
  periods: number = 30,
): Promise<HandoffReasonsResponse> {
  return fetchWithAuth(
    `/journeys/handoff-reasons?granularity=${granularity}&periods=${periods}`,
  );
}

export async function getTimeToHandoff(
  granularity: "day" | "week" | "month" = "day",
  periods: number = 30,
): Promise<TimeToHandoffResponse> {
  return fetchWithAuth(
    `/journeys/time-to-handoff?granularity=${granularity}&periods=${periods}`,
  );
}

export async function getAgentPerformance(
  granularity: "day" | "week" | "month" = "day",
  periods: number = 30,
): Promise<AgentPerformanceResponse> {
  return fetchWithAuth(
    `/journeys/agent-performance?granularity=${granularity}&periods=${periods}`,
  );
}

// Per-journey breakdown (completed self-serve vs assisted per journey step)
export interface JourneyBreakdownItem {
  step: string;
  assisted: number;
  completedSelfServe: number;
}

export interface JourneyBreakdownResponse {
  data: JourneyBreakdownItem[];
  summary: {
    totalAssisted: number;
    totalCompleted: number;
    journeyCount: number;
  };
  startDate: string;
  endDate: string;
}

export async function getJourneyBreakdown(
  granularity: "day" | "week" | "month" = "day",
  periods: number = 30,
): Promise<JourneyBreakdownResponse> {
  return fetchWithAuth(
    `/journeys/by-journey?granularity=${granularity}&periods=${periods}`,
  );
}
