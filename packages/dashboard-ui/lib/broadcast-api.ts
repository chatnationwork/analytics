import { fetchWithAuth, fetchWithAuthFull } from "./api";
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
  CampaignError,
} from "./broadcast-types";

export interface CampaignListParams {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  isTemplate?: boolean;
}

export const broadcastApi = {
  /**
   * List campaigns with optional filtering and pagination
   */
  async listCampaigns(
    page = 1,
    limit = 20,
    filters?: CampaignListParams | string,
  ): Promise<{ data: Campaign[]; total: number; page: number; limit: number }> {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
    });
    if (typeof filters === "string") {
      if (filters) params.set("status", filters);
    } else if (filters) {
      if (filters.status) params.set("status", filters.status);
      if (filters.search) params.set("search", filters.search);
      if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
      if (filters.dateTo) params.set("dateTo", filters.dateTo);
      if (filters.isTemplate !== undefined)
        params.set("isTemplate", String(filters.isTemplate));
    }

    return fetchWithAuth<{
      data: Campaign[];
      total: number;
      page: number;
      limit: number;
    }>(`/campaigns?${params}`);
  },

  /**
   * List campaigns with delivery metrics for analytics dashboard
   */
  async listCampaignsWithStats(page = 1, limit = 20): Promise<{ data: (Campaign & { stats: CampaignMetrics })[], total: number }> {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
    });
    return fetchWithAuth<{ data: (Campaign & { stats: CampaignMetrics })[], total: number }>(`/campaigns/analytics/list?${params}`);
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
    return fetchWithAuth<Campaign>("/campaigns", {
      method: "POST",
      body: JSON.stringify(dto),
    });
  },

  /**
   * Update an existing campaign
   */
  async updateCampaign(id: string, dto: UpdateCampaignDto): Promise<Campaign> {
    return fetchWithAuth<Campaign>(`/campaigns/${id}`, {
      method: "PATCH",
      body: JSON.stringify(dto),
    });
  },

  /**
   * Send a campaign immediately
   */
  async sendCampaign(id: string): Promise<void> {
    return fetchWithAuth(`/campaigns/${id}/send`, {
      method: "POST",
      body: JSON.stringify({}),
    });
  },

  /**
   * Schedule a campaign
   */
  async scheduleCampaign(id: string, scheduledAt: string): Promise<void> {
    return fetchWithAuth(`/campaigns/${id}/schedule`, {
      method: "POST",
      body: JSON.stringify({ scheduledAt }),
    });
  },

  /**
   * Cancel a running or scheduled campaign
   */
  async cancelCampaign(id: string): Promise<void> {
    return fetchWithAuth(`/campaigns/${id}/cancel`, {
      method: "POST",
      body: JSON.stringify({}),
    });
  },

  /**
   * Duplicate a campaign as a new draft (for rerun or save-as-template)
   */
  async duplicateCampaign(
    id: string,
    opts?: { asTemplate?: boolean },
  ): Promise<Campaign> {
    return fetchWithAuth<Campaign>(`/campaigns/${id}/duplicate`, {
      method: "POST",
      body: JSON.stringify(opts ?? {}),
    });
  },

  /**
   * Rerun a completed campaign: duplicate and send immediately
   */
  async rerunCampaign(id: string): Promise<{ campaignId: string }> {
    return fetchWithAuth<{ campaignId: string }>(`/campaigns/${id}/rerun`, {
      method: "POST",
      body: JSON.stringify({}),
    });
  },

  /**
   * Preview audience count and quota for a filter
   */
  async previewAudience(filter: AudienceFilter): Promise<AudiencePreview> {
    return fetchWithAuth<AudiencePreview>("/campaigns/audience/preview", {
      method: "POST",
      body: JSON.stringify({ audienceFilter: filter }),
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
  async getCampaignMessages(
    id: string,
    page = 1,
    limit = 50,
    status?: string,
  ): Promise<{ data: CampaignMessage[]; total: number }> {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
    });
    if (status) params.set("status", status);

    return fetchWithAuth<{ data: CampaignMessage[]; total: number }>(
      `/campaigns/${id}/messages?${params}`,
    );
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
    return fetchWithAuth<CampaignOverview>("/campaigns/analytics/overview");
  },

  /**
   * Get current conversation quota status
   */
  async getQuota(): Promise<QuotaStatus> {
    return fetchWithAuth<QuotaStatus>("/campaigns/quota");
  },
};
