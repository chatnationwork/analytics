/**
 * =============================================================================
 * AGENT ANALYTICS API CLIENT
 * =============================================================================
 *
 * Frontend API client for agent analytics.
 * Provides resolution, transfer, agent performance, and team metrics.
 */

import { fetchWithAuth } from "./api";

export type Granularity = "day" | "week" | "month";

// Response interfaces

export interface DashboardStatsResponse {
  resolutions: {
    total: number;
    uniqueAgents: number;
    percentChange: number;
  };
  transfers: {
    total: number;
    percentChange: number;
  };
  chats: {
    expired: number;
    active: number;
    resolved: number;
    unassigned: number;
    total: number;
    expiredRate: number;
  };
  agents: {
    activeAgents: number;
    totalHandoffs: number;
    resolutionRate: number;
    avgResolutionsPerAgent: number;
  };
  startDate: string;
  endDate: string;
  granularity: string;
}

export interface ResolutionOverviewResponse {
  totalResolved: number;
  uniqueAgents: number;
  uniqueSessions: number;
  percentChange: number;
  startDate: string;
  endDate: string;
  granularity: string;
}

export interface ResolutionTrendDataPoint {
  period: string;
  resolvedCount: number;
  activeAgents: number;
}

export interface ResolutionTrendResponse {
  data: ResolutionTrendDataPoint[];
  summary: {
    totalResolved: number;
    avgPerPeriod: number;
    percentChange: number;
  };
  startDate: string;
  endDate: string;
  granularity: string;
}

export interface ResolutionCategoryItem {
  category: string;
  count: number;
  percentage: number;
}

export interface ResolutionByCategoryResponse {
  data: ResolutionCategoryItem[];
  summary: {
    totalResolved: number;
    uniqueCategories: number;
  };
  startDate: string;
  endDate: string;
}

export interface ResolutionSubmissionItem {
  id: string;
  sessionId: string;
  contactId: string;
  contactName: string | null;
  category: string;
  outcome: string;
  notes: string | null;
  formData: Record<string, string | number | boolean> | null;
  resolvedByAgentId: string;
  resolvedByAgentName: string | null;
  createdAt: string;
}

export interface ResolutionSubmissionsResponse {
  data: ResolutionSubmissionItem[];
  total: number;
  page: number;
  limit: number;
  startDate: string;
  endDate: string;
  granularity: string;
}

export interface TransferOverviewResponse {
  totalTransfers: number;
  agentsTransferring: number;
  agentsReceiving: number;
  uniqueSessions: number;
  percentChange: number;
  startDate: string;
  endDate: string;
  granularity: string;
}

export interface TransferTrendDataPoint {
  period: string;
  transferCount: number;
}

export interface TransferTrendResponse {
  data: TransferTrendDataPoint[];
  summary: {
    totalTransfers: number;
    avgPerPeriod: number;
    percentChange: number;
  };
  startDate: string;
  endDate: string;
  granularity: string;
}

export interface TransferReasonItem {
  reason: string;
  count: number;
  percentage: number;
}

export interface TransferByReasonResponse {
  data: TransferReasonItem[];
  summary: {
    totalTransfers: number;
    uniqueReasons: number;
  };
  startDate: string;
  endDate: string;
}

export interface ExpiredChatsResponse {
  expiredCount: number;
  activeChats: number;
  assignedCount: number;
  resolvedCount: number;
  unassignedCount: number;
  totalChats: number;
  expiredRate: number;
}

export interface AgentLeaderboardItem {
  agentId: string;
  resolvedCount: number;
  categories: string[];
  transfersOut: number;
  transfersIn: number;
}

export interface AgentLeaderboardResponse {
  data: AgentLeaderboardItem[];
  summary: {
    totalResolved: number;
    totalAgents: number;
    avgResolutionsPerAgent: number;
  };
  startDate: string;
  endDate: string;
  granularity: string;
}

function buildParams(
  granularity: string,
  periods: number,
  startDate?: string,
  endDate?: string,
  extra?: Record<string, string | number>,
): string {
  const params = new URLSearchParams({
    granularity,
    periods: String(periods),
  });
  if (startDate) params.set("startDate", startDate);
  if (endDate) params.set("endDate", endDate);
  if (extra) {
    for (const [k, v] of Object.entries(extra)) params.set(k, String(v));
  }
  return params.toString();
}

// API functions

export async function getDashboardStats(
  granularity: Granularity = "day",
  periods: number = 30,
  startDate?: string,
  endDate?: string,
): Promise<DashboardStatsResponse> {
  return fetchWithAuth(
    `/agent-inbox-analytics/dashboard?${buildParams(granularity, periods, startDate, endDate)}`,
  );
}

export async function getResolutionOverview(
  granularity: Granularity = "day",
  periods: number = 30,
  startDate?: string,
  endDate?: string,
): Promise<ResolutionOverviewResponse> {
  return fetchWithAuth(
    `/agent-inbox-analytics/resolutions?${buildParams(granularity, periods, startDate, endDate)}`,
  );
}

export async function getResolutionTrend(
  granularity: Granularity = "day",
  periods: number = 30,
  startDate?: string,
  endDate?: string,
): Promise<ResolutionTrendResponse> {
  return fetchWithAuth(
    `/agent-inbox-analytics/resolutions/trend?${buildParams(granularity, periods, startDate, endDate)}`,
  );
}

export async function getResolutionByCategory(
  granularity: Granularity = "day",
  periods: number = 30,
  startDate?: string,
  endDate?: string,
): Promise<ResolutionByCategoryResponse> {
  return fetchWithAuth(
    `/agent-inbox-analytics/resolutions/by-category?${buildParams(granularity, periods, startDate, endDate)}`,
  );
}

export async function getResolutionSubmissions(
  granularity: Granularity = "day",
  periods: number = 30,
  page: number = 1,
  limit: number = 20,
  startDate?: string,
  endDate?: string,
): Promise<ResolutionSubmissionsResponse> {
  return fetchWithAuth(
    `/agent-inbox-analytics/resolutions/submissions?${buildParams(granularity, periods, startDate, endDate, { page, limit })}`,
  );
}

export async function getTransferOverview(
  granularity: Granularity = "day",
  periods: number = 30,
  startDate?: string,
  endDate?: string,
): Promise<TransferOverviewResponse> {
  return fetchWithAuth(
    `/agent-inbox-analytics/transfers?${buildParams(granularity, periods, startDate, endDate)}`,
  );
}

export async function getTransferTrend(
  granularity: Granularity = "day",
  periods: number = 30,
  startDate?: string,
  endDate?: string,
): Promise<TransferTrendResponse> {
  return fetchWithAuth(
    `/agent-inbox-analytics/transfers/trend?${buildParams(granularity, periods, startDate, endDate)}`,
  );
}

export async function getTransferByReason(
  granularity: Granularity = "day",
  periods: number = 30,
  startDate?: string,
  endDate?: string,
): Promise<TransferByReasonResponse> {
  return fetchWithAuth(
    `/agent-inbox-analytics/transfers/by-reason?${buildParams(granularity, periods, startDate, endDate)}`,
  );
}

export async function getExpiredChats(): Promise<ExpiredChatsResponse> {
  return fetchWithAuth(`/agent-inbox-analytics/expired-chats`);
}

export async function getAgentLeaderboard(
  granularity: Granularity = "day",
  periods: number = 30,
  limit: number = 10,
  startDate?: string,
  endDate?: string,
): Promise<AgentLeaderboardResponse> {
  return fetchWithAuth(
    `/agent-inbox-analytics/leaderboard?${buildParams(granularity, periods, startDate, endDate, { limit })}`,
  );
}

// =============================================================================
// AGENT PERFORMANCE INTERFACES
// =============================================================================

export interface AgentActivityDataPoint {
  period: string;
  activeAgents: number;
  resolutions: number;
  transfers: number;
  handoffs: number;
}

export interface AgentActivityResponse {
  data: AgentActivityDataPoint[];
  summary: {
    peakActiveAgents: number;
    avgActiveAgents: number;
  };
  startDate: string;
  endDate: string;
  granularity: string;
}

export interface AgentDetailedItem {
  agentId: string;
  resolvedCount: number;
  handoffsReceived: number;
  transfersOut: number;
  transfersIn: number;
  totalChatsHandled: number;
  resolutionRate: number;
}

export interface AgentDetailedResponse {
  data: AgentDetailedItem[];
  summary: {
    totalAgents: number;
    totalChatsHandled: number;
    avgChatsPerAgent: number;
  };
  startDate: string;
  endDate: string;
  granularity: string;
}

export interface AgentWorkloadResponse {
  totalAgents: number;
  totalChats: number;
  avgChatsPerAgent: number;
  maxChats: number;
  minChats: number;
  stddevChats: number;
  workloadBalanceScore: number;
  topAgents: Array<{ agentId: string; chatCount: number }>;
  startDate: string;
  endDate: string;
  granularity: string;
}

export interface AgentPerformanceSummaryResponse {
  agentsWithResolutions: number;
  agentsWithHandoffs: number;
  totalResolutions: number;
  totalTransfers: number;
  totalHandoffs: number;
  resolutionRate: number;
  avgResolutionsPerAgent: number;
  resolutionRateChange: number;
  startDate: string;
  endDate: string;
  granularity: string;
}

export interface AgentPerformanceMetricsResponse {
  assigned: number;
  resolved: number;
  unresolved: number;
  expired: number;
  avgFirstResponseMinutes: number | null;
  avgResolutionTimeMinutes: number | null;
  startDate: string;
  endDate: string;
  granularity: string;
}

// =============================================================================
// AGENT PERFORMANCE API FUNCTIONS
// =============================================================================

export async function getAgentActivity(
  granularity: Granularity = "day",
  periods: number = 30,
  startDate?: string,
  endDate?: string,
): Promise<AgentActivityResponse> {
  return fetchWithAuth(
    `/agent-inbox-analytics/agents/activity?${buildParams(granularity, periods, startDate, endDate)}`,
  );
}

export async function getAgentDetailedStats(
  granularity: Granularity = "day",
  periods: number = 30,
  startDate?: string,
  endDate?: string,
): Promise<AgentDetailedResponse> {
  return fetchWithAuth(
    `/agent-inbox-analytics/agents/detailed?${buildParams(granularity, periods, startDate, endDate)}`,
  );
}

export async function getAgentWorkload(
  granularity: Granularity = "day",
  periods: number = 30,
  startDate?: string,
  endDate?: string,
): Promise<AgentWorkloadResponse> {
  return fetchWithAuth(
    `/agent-inbox-analytics/agents/workload?${buildParams(granularity, periods, startDate, endDate)}`,
  );
}

export async function getAgentPerformanceSummary(
  granularity: Granularity = "day",
  periods: number = 30,
  startDate?: string,
  endDate?: string,
): Promise<AgentPerformanceSummaryResponse> {
  return fetchWithAuth(
    `/agent-inbox-analytics/agents/summary?${buildParams(granularity, periods, startDate, endDate)}`,
  );
}

export async function getAgentPerformanceMetrics(
  granularity: Granularity = "day",
  periods: number = 30,
  startDate?: string,
  endDate?: string,
): Promise<AgentPerformanceMetricsResponse> {
  return fetchWithAuth(
    `/agent-inbox-analytics/agents/performance-metrics?${buildParams(granularity, periods, startDate, endDate)}`,
  );
}
