

const API_BASE_URL = ''; // Relative path for proxy

/** Matches CampaignOverview returned by GET /campaigns/analytics/overview */
export interface CampaignOverview {
  totalCampaigns: number;
  activeCampaigns: number;
  totalMessagesSent: number;
  totalDelivered: number;
  totalRead: number;
  totalFailed: number;
  avgDeliveryRate: number;
  avgReadRate: number;
}

/** @deprecated Use CampaignOverview */
export type WhatsappOverview = CampaignOverview;

export interface Campaign {
  id: string;
  name: string;
  status: string;
  createdAt: string;
  scheduledAt: string | null;
  recipientCount: number;
}

export interface CampaignStats {
  total: number;
  pending: number;
  queued: number;
  sent: number;
  delivered: number;
  read: number;
  failed: number;
  deliveryRate: number;
  readRate: number;
  failureRate: number;
}

export interface CampaignWithStats extends Campaign {
  stats: CampaignStats;
}

export interface CampaignsListResponse {
  data: CampaignWithStats[];
  total: number;
  page: number;
  limit: number;
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
