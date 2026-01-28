import { fetchWithAuth } from './api';

export type Granularity = 'day' | 'week' | 'month';

export interface TrendDataPoint {
  period: string;
  count: number;
}

export interface SessionTrendResponse {
  data: TrendDataPoint[];
  summary: {
    total: number;
    previousTotal: number;
    percentChange: number;
  };
  granularity: Granularity;
  startDate: string;
  endDate: string;
}

export interface ConversionTrendDataPoint {
  period: string;
  totalSessions: number;
  conversions: number;
  conversionRate: number;
}

export interface ConversionTrendResponse {
  data: ConversionTrendDataPoint[];
  summary: {
    totalSessions: number;
    totalConversions: number;
    overallConversionRate: number;
  };
  granularity: Granularity;
  startDate: string;
  endDate: string;
}

export interface UserGrowthDataPoint {
  period: string;
  totalUsers: number;
  newUsers: number;
  returningUsers: number;
}

export interface UserGrowthTrendResponse {
  data: UserGrowthDataPoint[];
  summary: {
    totalNewUsers: number;
    totalReturningUsers: number;
    totalUsers: number;
    newUserPercent: number;
  };
  granularity: Granularity;
  startDate: string;
  endDate: string;
}

export interface SessionDurationDataPoint {
  period: string;
  avgDurationSeconds: number;
  sessionCount: number;
}

export interface SessionDurationTrendResponse {
  data: SessionDurationDataPoint[];
  summary: {
    overallAvgDurationSeconds: number;
    totalSessionsAnalyzed: number;
  };
  granularity: Granularity;
  startDate: string;
  endDate: string;
}

export interface DAUDataPoint {
  date: string;
  count: number;
}

export interface DAUTrendResponse {
  data: DAUDataPoint[];
  summary: {
    avgDailyActiveUsers: number;
    peakDAU: number;
    totalDataPoints: number;
  };
  startDate: string;
  endDate: string;
}

export const trendsApi = {
  /**
   * Get session count trend over time.
   */
  getSessionTrend: async (
    granularity: Granularity = 'day',
    periods: number = 30,
  ): Promise<SessionTrendResponse> => {
    return fetchWithAuth(
      `/trends/sessions?granularity=${granularity}&periods=${periods}`,
    );
  },

  /**
   * Get conversion rate trend over time.
   */
  getConversionTrend: async (
    granularity: Granularity = 'day',
    periods: number = 30,
  ): Promise<ConversionTrendResponse> => {
    return fetchWithAuth(
      `/trends/conversions?granularity=${granularity}&periods=${periods}`,
    );
  },

  /**
   * Get user growth trend (new vs returning).
   */
  getUserGrowthTrend: async (
    granularity: Granularity = 'day',
    periods: number = 30,
  ): Promise<UserGrowthTrendResponse> => {
    return fetchWithAuth(
      `/trends/user-growth?granularity=${granularity}&periods=${periods}`,
    );
  },

  /**
   * Get session duration trend.
   */
  getSessionDurationTrend: async (
    granularity: Granularity = 'day',
    periods: number = 30,
  ): Promise<SessionDurationTrendResponse> => {
    return fetchWithAuth(
      `/trends/session-duration?granularity=${granularity}&periods=${periods}`,
    );
  },

  /**
   * Get daily active users trend.
   */
  getDailyActiveUsersTrend: async (
    periods: number = 30,
  ): Promise<DAUTrendResponse> => {
    return fetchWithAuth(`/trends/daily-active-users?periods=${periods}`);
  },
};
