/**
 * CSAT Analytics API client.
 * Uses csat_submitted events (properties.rating, properties.feedback).
 */

import { fetchWithAuth } from "./api";

export type CsatGranularity = "day" | "week" | "month";

export interface CsatSummary {
  averageScore: number;
  totalResponses: number;
  distribution: Array<{ score: number; count: number; percentage: number }>;
  fiveStarPercent: number;
  percentChange?: number;
}

export interface CsatRecentFeedbackItem {
  timestamp: string;
  rating: number;
  feedback: string | null;
}

export interface CsatDashboardResponse {
  summary: CsatSummary;
  recentFeedback: CsatRecentFeedbackItem[];
  startDate: string;
  endDate: string;
  granularity: string;
}

export interface CsatByJourneyItem {
  journey: string;
  totalResponses: number;
  averageScore: number;
  distribution: Array<{ score: number; count: number; percentage: number }>;
  fiveStarPercent: number;
}

export interface CsatByJourneyResponse {
  data: CsatByJourneyItem[];
  startDate: string;
  endDate: string;
  granularity: string;
}

export async function getCsatDashboard(
  granularity: CsatGranularity = "day",
  periods: number = 30,
): Promise<CsatDashboardResponse> {
  return fetchWithAuth<CsatDashboardResponse>(
    `/csat-analytics/dashboard?granularity=${granularity}&periods=${periods}`,
  );
}

export async function getCsatByJourney(
  granularity: CsatGranularity = "day",
  periods: number = 30,
): Promise<CsatByJourneyResponse> {
  return fetchWithAuth<CsatByJourneyResponse>(
    `/csat-analytics/by-journey?granularity=${granularity}&periods=${periods}`,
  );
}
