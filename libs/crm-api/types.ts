/**
 * CRM API TypeScript Types
 * Auto-generated from OpenAPI specification
 */

// ============================================
// Common Types
// ============================================

export interface Pagination {
  page: number;
  limit: number;
  total: number;
}

export interface SuccessResponse {
  success: true;
  message?: string;
}

export interface ErrorDetail {
  field: string;
  message: string;
}

export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: ErrorDetail[];
  };
}

export type ApiResponse<T> = 
  | { success: true; data: T; message?: string }
  | ErrorResponse;

// ============================================
// Contact Types
// ============================================

export interface Contact {
  chat_id: string;
  whatsapp_number: string;
  email?: string;
  name?: string;
  created_at: string;
}

export interface CreateContactRequest {
  whatsapp_number: string;
  email?: string;
  name?: string;
  custom_fields?: Record<string, string>;
}

// export interface ContactListData {
//   contacts: Contact[];
//   pagination: Pagination;
// }

export type ContactResponse = ApiResponse<Contact>;

export type ContactListResponse = {
  success: true;
  data: Contact[];
  pagination: Pagination;
  message?: string;
} | ErrorResponse;
export type ContactSearchResponse = ApiResponse<Contact[]>;

export interface SearchContactParams {
  search_field: 'email' | 'whatsapp_number' | 'name';
  search_value: string;
  condition: 'contains' | 'equal to' | 'starts with' | 'ends with';
}

export interface ListContactsParams {
  page?: number;
  limit?: number;
}

// ============================================
// Chat Custom Field Types
// ============================================

export interface ChatCustomField {
  field_id: string;
  field_name: string;
  field_type: string;
  value: string;
}

export type ChatCustomFieldsResponse = ApiResponse<ChatCustomField[]>;

export interface MarkAsDoneRequest {
  metadata?: {
    resolution_notes?: string;
  };
}

export interface AssignChatRequest {
  operator_email: string;
  pause_automation?: boolean;
}

export interface AssignChatData {
  assigned_to: string;
}

export type AssignChatResponse = ApiResponse<AssignChatData> & {
  message?: string;
};

// ============================================
// Custom Field Types
// ============================================

export interface CustomField {
  custom_field_id: string;
  name: string;
  type: string;
  required: boolean;
}

export interface CreateCustomFieldRequest {
  name: string;
  type: string;
  required?: boolean;
  default_value?: string;
}

export type CustomFieldResponse = ApiResponse<CustomField>;
export type CustomFieldListResponse = ApiResponse<CustomField[]>;

// ============================================
// Campaign Types
// ============================================

export type CampaignStatus = 
  | 'draft' 
  | 'scheduled' 
  | 'active' 
  | 'in_progress' 
  | 'completed' 
  | 'failed';

export interface Campaign {
  campaign_id: string;
  name: string;
  status: CampaignStatus;
  created_at: string;
  scheduled_at: string | null;
  total_recipients?: number;
}

export interface CampaignReceiver {
  whatsapp_number: string;
  variables?: Record<string, string>;
}

export interface CreateCampaignRequest {
  name: string;
  template_name: string;
  template_language?: string;
  receivers: CampaignReceiver[];
  scheduled_at?: string;
}

export interface CloneCampaignRequest {
  source_campaign_id: string;
  new_name: string;
  receivers: CampaignReceiver[];
}

export interface CampaignMetrics {
  total_recipients: number;
  delivered: number;
  read: number;
  replied: number;
  failed: number;
}

// Duplicate removed

export interface TriggerCampaignData {
  campaign_id: string;
  status: CampaignStatus;
}

export type CampaignResponse = ApiResponse<Campaign>;
export type CampaignListResponse = {
  success: true;
  data: Campaign[];
  count: number;
  page: number;
  rows: number;
  message?: string;
} | ErrorResponse;

export type CampaignReportData = {
  campaign_id: string;
  name: string;
  metrics: CampaignMetrics;
  delivery_rate: string;
  read_rate: string;
  reply_rate: string;
};

export type CampaignReportResponse = (CampaignReportData & {
  success: true;
  message?: string;
}) | ErrorResponse;
export type TriggerCampaignResponse = ApiResponse<TriggerCampaignData> & {
  message?: string;
};

// ============================================
// Message Types
// ============================================

export type MessageType = 
  | 'text' 
  | 'image' 
  | 'document' 
  | 'audio' 
  | 'video' 
  | 'template';

export type MessageDirection = 'inbound' | 'outbound';

export type MessageStatus = 
  | 'sent' 
  | 'delivered' 
  | 'read' 
  | 'received' 
  | 'failed';

export interface Message {
  message_id: string;
  type: MessageType;
  content: string;
  direction: MessageDirection;
  status: MessageStatus;
  timestamp: string;
}

export interface MessagesData {
  messages: Message[];
  pagination: Pagination;
}

export type MessagesResponse = ApiResponse<MessagesData>;

export interface GetMessagesParams {
  page?: number;
  limit?: number;
  sort?: 'newest' | 'oldest';
}

// ============================================
// API Client Interface
// ============================================

export interface CrmApiClient {
  // Contact API
  createContact(data: CreateContactRequest): Promise<ContactResponse>;
  searchContact(params: SearchContactParams): Promise<ContactSearchResponse>;
  listContacts(params?: ListContactsParams): Promise<ContactListResponse>;
  getChatCustomFields(chatId: string): Promise<ChatCustomFieldsResponse>;
  markChatAsDone(chatId: string, data?: MarkAsDoneRequest): Promise<SuccessResponse>;
  assignChat(chatId: string, data: AssignChatRequest): Promise<AssignChatResponse>;
  deleteContact(chatId: string): Promise<SuccessResponse>;

  // Custom Field API
  listCustomFields(): Promise<CustomFieldListResponse>;
  createCustomField(data: CreateCustomFieldRequest): Promise<CustomFieldResponse>;
  deleteCustomField(customFieldId: string): Promise<SuccessResponse>;

  // Campaign API
  listCampaigns(): Promise<CampaignListResponse>;
  getCampaignReport(campaignId: string): Promise<CampaignReportResponse>;
  createCampaign(data: CreateCampaignRequest): Promise<CampaignResponse>;
  cloneCampaign(data: CloneCampaignRequest): Promise<CampaignResponse>;
  triggerCampaign(campaignId: string): Promise<TriggerCampaignResponse>;

  // Messages API
  getMessages(chatId: string, params?: GetMessagesParams): Promise<MessagesResponse>;
}

// ============================================
// API Configuration
// ============================================

export interface CrmApiConfig {
  baseUrl: string;
  apiKey: string;
  timeout?: number;
}

export const defaultConfig: Partial<CrmApiConfig> = {
  timeout: 30000,
};
