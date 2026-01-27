

const API_BASE_URL = ''; // Relative path for proxy

export interface WhatsappOverview {
  totalContacts: number;
  totalCampaigns: number;
  activeCampaigns: number;
  
  customerInsights: {
      totalContacts: number;
  };
  campaignOptimization: {
      funnel: {
          sent: number;
          delivered: number;
          read: number;
          replied: number;
      };
      topCampaigns: { name: string; readRate: number; replyRate: number }[];
  };
  engagement: {
      conversionRate: number;
  };
}

export interface Campaign {
  campaign_id: string;
  name: string;
  status: string;
  created_at: string;
  scheduled_at: string | null;
  total_recipients?: number;
}

const getHeaders = () => {
  return {
    'Content-Type': 'application/json',
  };
};

export const whatsappApi = {
  getOverview: async (): Promise<WhatsappOverview> => {
    const res = await fetch(`${API_BASE_URL}/api/dashboard/whatsapp/overview`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch WhatsApp overview');
    const json = await res.json();
    return json.data;
  },

  getCampaigns: async (): Promise<Campaign[]> => {
    const res = await fetch(`${API_BASE_URL}/api/dashboard/whatsapp/campaigns`, {
        headers: getHeaders(),
      });
      if (!res.ok) throw new Error('Failed to fetch campaigns');
      const json = await res.json();
      return json.data;
  }
};
