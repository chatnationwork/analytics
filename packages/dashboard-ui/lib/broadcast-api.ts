import { fetchWithAuth, fetchWithAuthFull } from './api';
import { 
  Campaign, 
  CampaignMetrics, 
  CampaignMessage, 
  CampaignOverview, 
  AudiencePreview, 
  AudienceFilter,
  CreateCampaignDto,
  UpdateCampaignDto,
  QuotaStatus,
  CampaignError
} from './broadcast-types';

export const broadcastApi = {
  /**
   * List campaigns with optional filtering
   */
  async listCampaigns(page = 1, limit = 20, status?: string): Promise<{ data: Campaign[], total: number }> {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
    });
    if (status) params.set('status', status);
    
    return fetchWithAuth<{ data: Campaign[], total: number }>(`/campaigns?${params}`);
  },

  /**
   * Get single campaign by ID
   */
  async getCampaign(id: string): Promise<Campaign> {
    return fetchWithAuth<Campaign>(`/campaigns/${id}`);
  },

  /**
   * Create a new campaign
   */
  async createCampaign(dto: CreateCampaignDto): Promise<Campaign> {
    return fetchWithAuth<Campaign>('/campaigns', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  },

  /**
   * Update an existing campaign
   */
  async updateCampaign(id: string, dto: UpdateCampaignDto): Promise<Campaign> {
    return fetchWithAuth<Campaign>(`/campaigns/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(dto),
    });
  },

  /**
   * Send a campaign immediately
   */
  async sendCampaign(id: string): Promise<void> {
    return fetchWithAuth(`/campaigns/${id}/send`, {
      method: 'POST',
    });
  },

  /**
   * Schedule a campaign
   */
  async scheduleCampaign(id: string, scheduledAt: string): Promise<void> {
    return fetchWithAuth(`/campaigns/${id}/schedule`, {
      method: 'POST',
      body: JSON.stringify({ scheduledAt }),
    });
  },

  /**
   * Cancel a running or scheduled campaign
   */
  async cancelCampaign(id: string): Promise<void> {
    return fetchWithAuth(`/campaigns/${id}/cancel`, {
      method: 'POST',
    });
  },

  /**
   * Preview audience count and quota for a filter
   */
  async previewAudience(filter: AudienceFilter): Promise<AudiencePreview> {
    return fetchWithAuth<AudiencePreview>('/campaigns/audience/preview', {
      method: 'POST',
      body: JSON.stringify(filter),
    });
  },

  /**
   * Get campaign delivery metrics
   */
  async getCampaignMetrics(id: string): Promise<CampaignMetrics> {
    return fetchWithAuth<CampaignMetrics>(`/campaigns/${id}/analytics`);
  },

  /**
   * Get per-message delivery log
   */
  async getCampaignMessages(id: string, page = 1, limit = 50, status?: string): Promise<{ data: CampaignMessage[], total: number }> {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
    });
    if (status) params.set('status', status);
    
    return fetchWithAuth<{ data: CampaignMessage[], total: number }>(`/campaigns/${id}/messages?${params}`);
  },

  /**
   * Get error breakdown for a campaign
   */
  async getCampaignErrors(id: string): Promise<CampaignError[]> {
    return fetchWithAuth<CampaignError[]>(`/campaigns/${id}/errors`);
  },

  /**
   * Get cross-campaign overview stats
   */
  async getOverview(): Promise<CampaignOverview> {
    return fetchWithAuth<CampaignOverview>('/campaigns/analytics/overview');
  },

  /**
   * Get current conversation quota status
   */
  async getQuota(): Promise<QuotaStatus> {
    return fetchWithAuth<QuotaStatus>('/campaigns/quota');
  }
};
