/**
 * =============================================================================
 * AI & AGENT PERFORMANCE TRENDS API CLIENT
 * =============================================================================
 *
 * Frontend API client for AI analytics and agent performance trends.
 */

import { fetchWithAuth } from "./api";

// Response interfaces

export interface ClassificationTrendDataPoint {
  period: string;
  classifications: number;
  errors: number;
  errorRate: number;
}

export interface ClassificationTrendResponse {
  data: ClassificationTrendDataPoint[];
  summary: {
    totalClassifications: number;
    totalErrors: number;
    avgErrorRate: number;
    percentChange: number;
  };
  startDate: string;
  endDate: string;
  granularity: string;
}

export interface LatencyTrendDataPoint {
  period: string;
  avgLatency: number;
  p50Latency: number;
  p95Latency: number;
  sampleCount: number;
}

export interface LatencyTrendResponse {
  data: LatencyTrendDataPoint[];
  summary: {
    avgP50Latency: number;
    avgP95Latency: number;
    totalSamples: number;
  };
  startDate: string;
  endDate: string;
  granularity: string;
}

export interface ConfidenceTrendDataPoint {
  period: string;
  avgConfidence: number;
  minConfidence: number;
  maxConfidence: number;
  sampleCount: number;
}

export interface ConfidenceTrendResponse {
  data: ConfidenceTrendDataPoint[];
  summary: {
    avgConfidence: number;
    totalSamples: number;
  };
  startDate: string;
  endDate: string;
  granularity: string;
}

export interface AgentResolvedTrendDataPoint {
  period: string;
  resolvedCount: number;
  activeAgents: number;
}

export interface AgentResolvedTrendResponse {
  data: AgentResolvedTrendDataPoint[];
  summary: {
    totalResolved: number;
    percentChange: number;
  };
  startDate: string;
  endDate: string;
  granularity: string;
}

export interface ResolutionTimeTrendDataPoint {
  period: string;
  avgResolutionTime: number;
  p50ResolutionTime: number;
  p95ResolutionTime: number;
  sampleCount: number;
}

export interface ResolutionTimeTrendResponse {
  data: ResolutionTimeTrendDataPoint[];
  summary: {
    avgResolutionTime: number;
    totalSamples: number;
  };
  startDate: string;
  endDate: string;
  granularity: string;
}

export interface TopAgentItem {
  agentId: string;
  resolvedCount: number;
  avgResolutionTime: number;
}

// API functions

export async function getClassificationTrend(
  granularity: "day" | "week" | "month" = "day",
  periods: number = 30,
): Promise<ClassificationTrendResponse> {
  return fetchWithAuth(
    `/ai-analytics/trends/classifications?granularity=${granularity}&periods=${periods}`,
  );
}

export async function getLatencyTrend(
  granularity: "day" | "week" | "month" = "day",
  periods: number = 30,
): Promise<LatencyTrendResponse> {
  return fetchWithAuth(
    `/ai-analytics/trends/latency?granularity=${granularity}&periods=${periods}`,
  );
}

export async function getConfidenceTrend(
  granularity: "day" | "week" | "month" = "day",
  periods: number = 30,
): Promise<ConfidenceTrendResponse> {
  return fetchWithAuth(
    `/ai-analytics/trends/confidence?granularity=${granularity}&periods=${periods}`,
  );
}

export async function getAgentResolvedTrend(
  granularity: "day" | "week" | "month" = "day",
  periods: number = 30,
): Promise<AgentResolvedTrendResponse> {
  return fetchWithAuth(
    `/ai-analytics/trends/agent-resolved?granularity=${granularity}&periods=${periods}`,
  );
}

export async function getResolutionTimeTrend(
  granularity: "day" | "week" | "month" = "day",
  periods: number = 30,
): Promise<ResolutionTimeTrendResponse> {
  return fetchWithAuth(
    `/ai-analytics/trends/resolution-time?granularity=${granularity}&periods=${periods}`,
  );
}

export async function getTopAgents(
  granularity: "day" | "week" | "month" = "day",
  periods: number = 30,
  limit: number = 10,
): Promise<TopAgentItem[]> {
  return fetchWithAuth(
    `/ai-analytics/top-agents?granularity=${granularity}&periods=${periods}&limit=${limit}`,
  );
}
