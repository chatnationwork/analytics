import { fetchWithAuth } from './api';

export interface AiStats {
  totalClassifications: number;
  avgLatencyMs: number;
  avgConfidence: number;
  errorCount: number;
  errorRate: number;
}

export interface AiIntent {
  intent: string;
  count: number;
  avgConfidence: number;
}

export interface AiLatencyBucket {
  bucket: string;
  count: number;
}

export interface AiError {
  errorType: string;
  count: number;
  recoveredCount: number;
}

export const aiAnalyticsApi = {
  getStats: async (): Promise<AiStats> => {
    const res = await fetchWithAuth('/ai-analytics/stats');
    return res.json();
  },

  getIntents: async (): Promise<AiIntent[]> => {
    const res = await fetchWithAuth('/ai-analytics/intents');
    return res.json();
  },

  getLatency: async (): Promise<AiLatencyBucket[]> => {
    const res = await fetchWithAuth('/ai-analytics/latency');
    return res.json();
  },

  getErrors: async (): Promise<AiError[]> => {
    const res = await fetchWithAuth('/ai-analytics/errors');
    return res.json();
  },
};
