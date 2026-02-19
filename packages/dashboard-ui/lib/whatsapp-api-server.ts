import { fetchServer } from './api-server';
import { CampaignOverview, CampaignsListResponse } from './whatsapp-api';

export const whatsappServerApi = {
  getOverview: async (): Promise<CampaignOverview> => {
    return fetchServer<CampaignOverview>('/api/dashboard/campaigns/analytics/overview');
  },

  getCampaigns: async (page = 1, limit = 20): Promise<CampaignsListResponse> => {
    return fetchServer<CampaignsListResponse>(`/api/dashboard/campaigns/analytics/list?page=${page}&limit=${limit}`);
  },
};
