import { fetchServer } from './api-server';
import { WhatsappOverview, Campaign } from './whatsapp-api';

export const whatsappServerApi = {
  getOverview: async (): Promise<WhatsappOverview> => {
    return fetchServer<WhatsappOverview>('/api/dashboard/whatsapp/overview');
  },

  getCampaigns: async (page = 1, limit = 20): Promise<Campaign[]> => {
    return fetchServer<Campaign[]>(`/api/dashboard/whatsapp/campaigns?page=${page}&limit=${limit}`);
  },

  getContacts: async (page = 1, limit = 20): Promise<{ data: any[], total: number, page: number, limit: number }> => {
    return fetchServer<{ data: any[], total: number, page: number, limit: number }>(`/api/dashboard/whatsapp/contacts?page=${page}&limit=${limit}`);
  }
};
