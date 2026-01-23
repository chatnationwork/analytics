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
    const res = await fetchWithAuth('/overview/devices');
    return res.json();
  },

  getBrowserBreakdown: async (): Promise<BrowserData[]> => {
    const res = await fetchWithAuth('/overview/browsers');
    return res.json();
  },

  getDailyActiveUsers: async (): Promise<DailyActiveUsers[]> => {
    const res = await fetchWithAuth('/overview/daily-users');
    return res.json();
  },

  getUserIdentityStats: async (): Promise<UserIdentityStats> => {
    const res = await fetchWithAuth('/overview/user-identity');
    return res.json();
  },
};
