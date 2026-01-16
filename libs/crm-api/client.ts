/**
 * CRM API Client
 * A type-safe client for interacting with the CRM API
 */

import {
  CrmApiConfig,
  CrmApiClient,
  CreateContactRequest,
  ContactResponse,
  ContactListResponse,
  ContactSearchResponse,
  SearchContactParams,
  ListContactsParams,
  ChatCustomFieldsResponse,
  MarkAsDoneRequest,
  AssignChatRequest,
  AssignChatResponse,
  SuccessResponse,
  CustomFieldListResponse,
  CreateCustomFieldRequest,
  CustomFieldResponse,
  CampaignListResponse,
  CampaignReportResponse,
  CreateCampaignRequest,
  CampaignResponse,
  CloneCampaignRequest,
  TriggerCampaignResponse,
  MessagesResponse,
  GetMessagesParams,
  ErrorResponse,
} from './types';

export class CrmApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: Array<{ field: string; message: string }>,
  ) {
    super(message);
    this.name = 'CrmApiError';
    Object.setPrototypeOf(this, CrmApiError.prototype);
  }
}

export class CrmApi implements CrmApiClient {
  private baseUrl: string;
  private apiKey: string;
  private timeout: number;

  constructor(config: CrmApiConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, ''); // Remove trailing slash
    this.apiKey = config.apiKey;
    this.timeout = config.timeout ?? 30000;
  }

  private async request<T>(
    method: string,
    path: string,
    options: {
      body?: unknown;
      params?: Record<string, string | number | undefined>;
    } = {},
  ): Promise<T> {
    const url = new URL(`${this.baseUrl}${path}`);

    // Add query parameters
    if (options.params) {
      Object.entries(options.params).forEach(([key, value]) => {
        if (value !== undefined) {
          url.searchParams.append(key, String(value));
        }
      });
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url.toString(), {
        method,
        headers: {
          'API-KEY': this.apiKey,
          'Content-Type': 'application/json',
        },
        body: options.body ? JSON.stringify(options.body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const data = await response.json();
      
      if (!response.ok || data.success === false) {
        const errorData = data as any; // Cast to any to check structure
        
        // Extract error message from various possible fields
        const message = 
          errorData.error?.message ?? 
          errorData.message ?? 
          errorData.developer_message ?? 
          errorData.title ?? 
          (typeof errorData.data === 'string' ? errorData.data : undefined) ??
          'An unknown error occurred';

        const code = errorData.error?.code ?? errorData.code ?? 'API_ERROR';
        const details = errorData.error?.details ?? errorData.details;

        throw new CrmApiError(code, message, details);
      }

      return data as T;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof CrmApiError || (error as Error).name === 'CrmApiError') {
        throw error;
      }

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new CrmApiError('TIMEOUT', 'Request timed out');
        }
        throw new CrmApiError('NETWORK_ERROR', error.message);
      }

      throw new CrmApiError('UNKNOWN_ERROR', 'An unknown error occurred');
    }
  }

  // ==========================================
  // Contact API
  // ==========================================

  async createContact(data: CreateContactRequest): Promise<ContactResponse> {
    return this.request<ContactResponse>('POST', '/crm/chat', { body: data });
  }

  async searchContact(params: SearchContactParams): Promise<ContactSearchResponse> {
    return this.request<ContactSearchResponse>('GET', '/crm/chat/search', {
      params: {
        search_field: params.search_field,
        search_value: params.search_value,
        condition: params.condition,
      },
    });
  }

  async listContacts(params: ListContactsParams = {}): Promise<ContactListResponse> {
    return this.request<ContactListResponse>('GET', '/crm/chat', {
      params: {
        page: params.page,
        limit: params.limit,
      },
    });
  }

  async getChatCustomFields(chatId: string): Promise<ChatCustomFieldsResponse> {
    return this.request<ChatCustomFieldsResponse>(
      'GET',
      `/crm/chat/setting/${chatId}/custom-field`,
    );
  }

  async markChatAsDone(
    chatId: string,
    data: MarkAsDoneRequest = {},
  ): Promise<SuccessResponse> {
    return this.request<SuccessResponse>(
      'POST',
      `/crm/chat/setting/${chatId}/operator/mark_as_done`,
      { body: data },
    );
  }

  async assignChat(
    chatId: string,
    data: AssignChatRequest,
  ): Promise<AssignChatResponse> {
    return this.request<AssignChatResponse>(
      'POST',
      `/crm/chat/setting/${chatId}/operator/assign_chat`,
      { body: data },
    );
  }

  async deleteContact(chatId: string): Promise<SuccessResponse> {
    return this.request<SuccessResponse>('DELETE', `/crm/chat/${chatId}`);
  }

  // ==========================================
  // Custom Field API
  // ==========================================

  async listCustomFields(): Promise<CustomFieldListResponse> {
    return this.request<CustomFieldListResponse>('GET', '/crm/setting/custom-field');
  }

  async createCustomField(
    data: CreateCustomFieldRequest,
  ): Promise<CustomFieldResponse> {
    return this.request<CustomFieldResponse>('POST', '/crm/setting/custom-field', {
      body: data,
    });
  }

  async deleteCustomField(customFieldId: string): Promise<SuccessResponse> {
    return this.request<SuccessResponse>(
      'DELETE',
      `/crm/setting/custom-field/${customFieldId}`,
    );
  }

  // ==========================================
  // Campaign API
  // ==========================================

  async listCampaigns(): Promise<CampaignListResponse> {
    return this.request<CampaignListResponse>('GET', '/crm/campaign');
  }

  async getCampaignReport(campaignId: string): Promise<CampaignReportResponse> {
    return this.request<CampaignReportResponse>(
      'GET',
      `/crm/campaign/${campaignId}/report`,
    );
  }

  async createCampaign(data: CreateCampaignRequest): Promise<CampaignResponse> {
    return this.request<CampaignResponse>('POST', '/crm/campaign', { body: data });
  }

  async cloneCampaign(data: CloneCampaignRequest): Promise<CampaignResponse> {
    return this.request<CampaignResponse>('POST', '/crm/campaign/clone', {
      body: data,
    });
  }

  async triggerCampaign(campaignId: string): Promise<TriggerCampaignResponse> {
    return this.request<TriggerCampaignResponse>(
      'POST',
      `/crm/campaign/${campaignId}/trigger`,
    );
  }

  // ==========================================
  // Messages API
  // ==========================================

  async getMessages(
    chatId: string,
    params: GetMessagesParams = {},
  ): Promise<MessagesResponse> {
    return this.request<MessagesResponse>('GET', `/crm/chat/${chatId}/messages`, {
      params: {
        page: params.page,
        limit: params.limit,
        sort: params.sort,
      },
    });
  }
}

/**
 * Create a CRM API client instance
 */
export function createCrmApiClient(config: CrmApiConfig): CrmApiClient {
  return new CrmApi(config);
}

export default CrmApi;
