/** BullMQ queue name for campaign message sending. */
export const CAMPAIGN_QUEUE_NAME = "campaign-send";

/** Injection token for the Redis client used by the rate tracker. */
export const CAMPAIGN_REDIS_CLIENT = "CAMPAIGN_REDIS_CLIENT";

/** Job names within the campaign queue. */
export const CAMPAIGN_JOBS = {
  /** Send a single message to a recipient. */
  SEND_MESSAGE: "send-message",
  /** Execute a full campaign (resolve audience, enqueue sends). */
  EXECUTE_CAMPAIGN: "execute-campaign",
} as const;

/** Predefined event trigger types that modules can fire to activate campaigns. */
export enum CampaignTrigger {
  // Ticketing / Events module
  TICKET_PURCHASED = "ticket.purchased",
  TICKET_ISSUED = "ticket.issued",
  EVENT_CHECKIN = "event.checkin",
  EVENT_REGISTRATION = "event.registration",
  EVENT_PUBLISHED = "event.published",
  EXHIBITOR_APPROVED = "exhibitor.approved",
  EVENT_COMPLETED = "event.completed",

  // Surveys module
  SURVEY_COMPLETED = "survey.completed",

  // Content module
  CONTENT_PUBLISHED = "content.published",

  // General / CRM
  CONTACT_CREATED = "contact.created",
  PAYMENT_RECEIVED = "payment.received",
  PAYMENT_OVERDUE = "payment.overdue",

  // Agent system
  SESSION_RESOLVED = "session.resolved",

  // Lead Generation
  HOT_LEAD_CAPTURED = "lead.hot_captured",

  // Exhibitor Onboarding
  EXHIBITOR_INVITED = "exhibitor.invited",
}

/** Maximum batch size when enqueuing jobs to BullMQ. */
export const ENQUEUE_BATCH_SIZE = 500;

/** WhatsApp Cloud API error codes that are retryable. */
export const RETRYABLE_WA_ERROR_CODES = new Set([
  "429", // Too Many Requests
  "500", // Internal Server Error
  "503", // Service Unavailable
  "131048", // WhatsApp rate limit
  "131056", // WhatsApp pair rate limit
]);

// ── Rate Limiting & Delivery Strategy ──────────────────────────────────

/** WhatsApp Cloud API per-phone-number burst limit (messages per second). */
export const WA_MAX_MESSAGES_PER_SECOND = 80;

/** WhatsApp 24-hour conversation window duration in milliseconds. */
export const WA_CONVERSATION_WINDOW_MS = 24 * 60 * 60 * 1000;

/** WhatsApp Business API messaging tier limits (business-initiated conversations per 24h). */
export enum ConversationTier {
  TIER_1 = "tier_1",
  TIER_2 = "tier_2",
  TIER_3 = "tier_3",
  TIER_4 = "tier_4",
}

export const CONVERSATION_TIER_LIMITS: Record<ConversationTier, number> = {
  [ConversationTier.TIER_1]: 1_000,
  [ConversationTier.TIER_2]: 10_000,
  [ConversationTier.TIER_3]: 100_000,
  [ConversationTier.TIER_4]: Infinity,
};

/** Default tier for tenants without explicit config. */
export const DEFAULT_CONVERSATION_TIER = ConversationTier.TIER_2;

/**
 * Delivery tier thresholds.
 * Controls how jobs are staggered based on out-of-window audience size.
 */
export const DELIVERY_TIERS = {
  /** Up to this size: enqueue all at once, rate limiter handles pacing. */
  IMMEDIATE_MAX: 1_000,
  /** Up to this size: enqueue in small chunks with short delays. */
  CHUNKED_MAX: 10_000,
  /** Beyond this: larger chunks with proportionally larger delays. */
} as const;

/** Chunk size for staggered enqueue at the CHUNKED tier. */
export const STAGGER_CHUNK_SIZE = 100;

/** Delay between staggered chunks in ms (100 msgs / 80 msg/s = 1.25s). */
export const STAGGER_DELAY_MS = 1_250;

/** Chunk size for large-audience staggered enqueue. */
export const LARGE_STAGGER_CHUNK_SIZE = 500;

/** Delay between large-audience chunks in ms (500 msgs / 80 msg/s = 6.25s). */
export const LARGE_STAGGER_DELAY_MS = 6_250;

/** Redis key prefix for 24h conversation quota tracking. */
export const QUOTA_REDIS_KEY_PREFIX = "wa:biz-conv";

/** TTL for hourly quota buckets in Redis (25 hours to cover full 24h window). */
export const QUOTA_BUCKET_TTL_SECONDS = 25 * 60 * 60;
