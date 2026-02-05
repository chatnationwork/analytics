import { fetchWithAuth } from "./api";

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

function buildOverviewParams(
  tenantId?: string,
  startDate?: string,
  endDate?: string,
): string {
  const params = new URLSearchParams();
  if (tenantId) params.set("tenantId", tenantId);
  if (startDate) params.set("startDate", startDate);
  if (endDate) params.set("endDate", endDate);
  const q = params.toString();
  return q ? `?${q}` : "";
}

export const overviewEnhancedApi = {
  getDeviceBreakdown: async (
    tenantId?: string,
    startDate?: string,
    endDate?: string,
  ): Promise<DeviceData[]> => {
    return fetchWithAuth(
      `/overview/devices${buildOverviewParams(tenantId, startDate, endDate)}`,
    );
  },

  getBrowserBreakdown: async (
    tenantId?: string,
    startDate?: string,
    endDate?: string,
  ): Promise<BrowserData[]> => {
    return fetchWithAuth(
      `/overview/browsers${buildOverviewParams(tenantId, startDate, endDate)}`,
    );
  },

  getDailyActiveUsers: async (
    tenantId?: string,
    startDate?: string,
    endDate?: string,
  ): Promise<DailyActiveUsers[]> => {
    return fetchWithAuth(
      `/overview/daily-users${buildOverviewParams(tenantId, startDate, endDate)}`,
    );
  },

  getUserIdentityStats: async (
    tenantId?: string,
    startDate?: string,
    endDate?: string,
  ): Promise<UserIdentityStats> => {
    return fetchWithAuth(
      `/overview/user-identity${buildOverviewParams(tenantId, startDate, endDate)}`,
    );
  },
};
