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

export interface AiContainment {
  totalAiSessions: number;
  handedOffSessions: number;
  containedSessions: number;
  containmentRate: number;
}

export const aiAnalyticsApi = {
  getStats: async (startDate?: string, endDate?: string): Promise<AiStats> => {
    const params = new URLSearchParams();
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    
    return fetchWithAuth(`/ai-analytics/stats?${params}`);
  },

  getIntents: async (startDate?: string, endDate?: string): Promise<AiIntent[]> => {
    const params = new URLSearchParams();
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);

    return fetchWithAuth(`/ai-analytics/intents?${params}`);
  },

  getLatency: async (startDate?: string, endDate?: string): Promise<AiLatencyBucket[]> => {
    const params = new URLSearchParams();
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);

    return fetchWithAuth(`/ai-analytics/latency?${params}`);
  },

  getErrors: async (startDate?: string, endDate?: string): Promise<AiError[]> => {
    const params = new URLSearchParams();
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);

    return fetchWithAuth(`/ai-analytics/errors?${params}`);
  },

  getContainment: async (startDate?: string, endDate?: string): Promise<AiContainment> => {
    const params = new URLSearchParams();
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);

    return fetchWithAuth(`/ai-analytics/containment?${params}`);
  },
};

