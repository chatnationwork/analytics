import { fetchWithAuth } from './api';

export interface DeviceData {
  deviceType: string;
  count: number;
}

export interface BrowserData {
  browserName: string;
  count: number;
}

export interface DailyActiveUsers {
  date: string;
  count: number;
}

export interface UserIdentityStats {
  total: number;
  identified: number;
  anonymous: number;
  identifiedPercent: number;
}

export const overviewEnhancedApi = {
  getDeviceBreakdown: async (): Promise<DeviceData[]> => {
    return fetchWithAuth('/overview/devices');
  },

  getBrowserBreakdown: async (): Promise<BrowserData[]> => {
    return fetchWithAuth('/overview/browsers');
  },

  getDailyActiveUsers: async (): Promise<DailyActiveUsers[]> => {
    return fetchWithAuth('/overview/daily-users');
  },

  getUserIdentityStats: async (): Promise<UserIdentityStats> => {
    return fetchWithAuth('/overview/user-identity');
  },
};
