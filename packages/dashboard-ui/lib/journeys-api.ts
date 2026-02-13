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
  completedSessions: number;
  abandonedSessions: number;

  selfServeRate: number;
  assistedRate: number;
  completionRate: number;
  abandonmentRate: number;

  selfServeChange: number;
  assistedChange: number;
  completionChange: number;
  abandonmentChange: number;

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

function buildJourneyParams(
  granularity: string,
  periods: number,
  startDate?: string,
  endDate?: string,
): string {
  const params = new URLSearchParams({
    granularity,
    periods: String(periods),
  });
  if (startDate) params.set("startDate", startDate);
  if (endDate) params.set("endDate", endDate);
  return params.toString();
}

// API functions

export async function getJourneyOverview(
  granularity: "day" | "week" | "month" = "day",
  periods: number = 30,
  startDate?: string,
  endDate?: string,
): Promise<JourneyOverviewResponse> {
  return fetchWithAuth(
    `/journeys/overview?${buildJourneyParams(granularity, periods, startDate, endDate)}`,
  );
}

export async function getHandoffTrend(
  granularity: "day" | "week" | "month" = "day",
  periods: number = 30,
  startDate?: string,
  endDate?: string,
): Promise<HandoffTrendResponse> {
  return fetchWithAuth(
    `/journeys/trends/handoff?${buildJourneyParams(granularity, periods, startDate, endDate)}`,
  );
}

export async function getHandoffByStep(
  granularity: "day" | "week" | "month" = "day",
  periods: number = 30,
  startDate?: string,
  endDate?: string,
): Promise<HandoffByStepResponse> {
  return fetchWithAuth(
    `/journeys/handoff-by-step?${buildJourneyParams(granularity, periods, startDate, endDate)}`,
  );
}

export async function getHandoffReasons(
  granularity: "day" | "week" | "month" = "day",
  periods: number = 30,
  startDate?: string,
  endDate?: string,
): Promise<HandoffReasonsResponse> {
  return fetchWithAuth(
    `/journeys/handoff-reasons?${buildJourneyParams(granularity, periods, startDate, endDate)}`,
  );
}

export async function getTimeToHandoff(
  granularity: "day" | "week" | "month" = "day",
  periods: number = 30,
  startDate?: string,
  endDate?: string,
): Promise<TimeToHandoffResponse> {
  return fetchWithAuth(
    `/journeys/time-to-handoff?${buildJourneyParams(granularity, periods, startDate, endDate)}`,
  );
}

export async function getAgentPerformance(
  granularity: "day" | "week" | "month" = "day",
  periods: number = 30,
  startDate?: string,
  endDate?: string,
): Promise<AgentPerformanceResponse> {
  return fetchWithAuth(
    `/journeys/agent-performance?${buildJourneyParams(granularity, periods, startDate, endDate)}`,
  );
}

export async function getJourneyLabels(): Promise<Record<string, string>> {
  return fetchWithAuth("/journeys/journey-labels");
}

// Per-journey breakdown (started, completed, dropped off, assisted per journey step)
export interface JourneyBreakdownItem {
  step: string;
  assisted: number;
  completedSelfServe: number;
  started: number;
  completed: number;
  droppedOff: number;
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
  startDate?: string,
  endDate?: string,
): Promise<JourneyBreakdownResponse> {
  return fetchWithAuth(
    `/journeys/by-journey?${buildJourneyParams(granularity, periods, startDate, endDate)}`,
  );
}
