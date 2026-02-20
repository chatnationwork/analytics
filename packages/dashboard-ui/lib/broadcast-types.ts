export type CampaignType = 
  | 'manual' 
  | 'scheduled' 
  | 'event_triggered' 
  | 'module_initiated';

export type CampaignStatus = 
  | 'draft' 
  | 'scheduled' 
  | 'running' 
  | 'paused' 
  | 'completed' 
  | 'failed' 
  | 'cancelled';

export type CampaignMessageStatus = 
  | 'pending' 
  | 'queued' 
  | 'sent' 
  | 'delivered' 
  | 'read' 
  | 'failed';

export interface FilterCondition {
  field: string;
  operator: string;
  value: unknown;
}

export interface AudienceFilter {
  conditions: FilterCondition[];
  logic: 'AND' | 'OR';
}

export interface Campaign {
  id: string;
  tenantId: string;
  name: string;
  type: CampaignType;
  status: CampaignStatus;
  sourceModule?: string;
  sourceReferenceId?: string;
  messageTemplate: Record<string, any>;
  audienceFilter?: AudienceFilter;
  recipientCount: number;
  scheduledAt?: string;
  startedAt?: string;
  completedAt?: string;
  triggerType?: string;
  triggerConfig?: Record<string, any>;
  isTemplate?: boolean;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CampaignMessage {
  id: string;
  campaignId: string;
  contactId: string;
  recipientPhone: string;
  status: CampaignMessageStatus;
  waMessageId?: string;
  errorMessage?: string;
  errorCode?: string;
  attempts: number;
  sentAt?: string;
  deliveredAt?: string;
  readAt?: string;
  failedAt?: string;
  createdAt: string;
}

export interface CampaignMetrics {
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

export interface QuotaStatus {
  businessSent24h: number;
  tierLimit: number | null;
  remaining: number | null;
  tier: string;
}

export interface AudiencePreview {
  total: number;
  inWindow: number;
  outOfWindow: number;
  quotaStatus: QuotaStatus;
  sampleContacts: any[];
}

export interface CampaignError {
  errorCode: string;
  errorMessage: string;
  count: number;
}

export interface RecurrenceConfig {
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  startDate: string;
  endDate?: string;
  time: string; // "HH:mm"
  daysOfWeek?: number[]; // 0-6 for weekly (0=Sunday)
  dayOfMonth?: number; // 1-31 for monthly/yearly
  monthOfYear?: number; // 0-11 for yearly
}

export interface CreateCampaignDto {
  name: string;
  type: CampaignType;
  messageTemplate?: Record<string, any>;
  templateId?: string;
  templateParams?: Record<string, string>;
  audienceFilter?: AudienceFilter;
  segmentId?: string;
  sourceModule?: string;
  sourceReferenceId?: string;
  scheduledAt?: string;
  recurrence?: RecurrenceConfig;
  triggerType?: string;
  triggerConfig?: Record<string, any>;
}

export interface UpdateCampaignDto {
  name?: string;
  type?: CampaignType;
  messageTemplate?: Record<string, any>;
  audienceFilter?: AudienceFilter;
  scheduledAt?: string;
  triggerType?: string;
  triggerConfig?: Record<string, any>;
  isTemplate?: boolean;
}
