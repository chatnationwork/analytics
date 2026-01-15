export interface AnalyticsEvent {
  eventId: string;
  messageId: string;
  eventName: string;
  eventType: string;
  timestamp: Date;
  anonymousId: string;
  userId?: string;
  sessionId: string;
  channelType: string;
  context: EventContext;
  properties?: Record<string, unknown>;
}

export interface EventContext {
  library?: {
    name: string;
    version: string;
  };
  page?: {
    path?: string;
    referrer?: string;
    search?: string;
    title?: string;
    url?: string;
  };
  userAgent?: string;
  locale?: string;
  screen?: {
    width?: number;
    height?: number;
  };
  handshakeToken?: string;
}

export interface EnrichedEvent extends AnalyticsEvent {
  tenantId: string;
  projectId: string;
  receivedAt: Date;
  processedAt?: Date;
  ipAddress?: string;
  deviceType?: string;
  osName?: string;
  osVersion?: string;
  browserName?: string;
  browserVersion?: string;
  countryCode?: string;
  city?: string;
  pagePath?: string;
  pageUrl?: string;
  pageTitle?: string;
  pageReferrer?: string;
}
