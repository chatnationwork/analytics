/**
 * RateTrackerService -- Redis-backed 24h rolling counter for WhatsApp
 * business-initiated conversations.
 *
 * Only out-of-window sends (contacts who haven't messaged in 24h) count
 * against the tier limit. In-window sends are free (customer-initiated
 * conversation window is still open).
 *
 * Uses hourly Redis buckets: wa:biz-conv:{phoneNumberId}:{YYYYMMDDHH}
 * Each bucket expires after 25h. The rolling 24h count sums the last 24 buckets.
 */

import { Inject, Injectable, Logger, OnModuleInit } from "@nestjs/common";
import Redis from "ioredis";
import { ConfigService } from "@nestjs/config";
import { CrmIntegrationsService } from "../crm-integrations/crm-integrations.service";
import { CAMPAIGN_REDIS_CLIENT } from "./campaigns.module";
import {
  QUOTA_REDIS_KEY_PREFIX,
  QUOTA_BUCKET_TTL_SECONDS,
  DEFAULT_CONVERSATION_TIER,
  CONVERSATION_TIER_LIMITS,
  ConversationTier,
} from "./constants";

export interface QuotaStatus {
  /** Business-initiated conversations sent in the last 24h. */
  businessSent24h: number;
  /** Current tier limit. */
  tierLimit: number;
  /** Remaining quota. */
  remaining: number;
  /** Tier name. */
  tier: ConversationTier;
}

@Injectable()
export class RateTrackerService implements OnModuleInit {
  private readonly logger = new Logger(RateTrackerService.name);

  constructor(
    @Inject(CAMPAIGN_REDIS_CLIENT) private readonly redis: Redis,
    private readonly configService: ConfigService,
    private readonly crmService: CrmIntegrationsService,
  ) {}

  async onModuleInit(): Promise<void> {
    try {
      await this.redis.connect();
    } catch {
      this.logger.warn(
        "Rate tracker Redis already connected or connection deferred",
      );
    }
  }

  /**
   * Record a business-initiated send (out-of-window contact).
   * Increments the current hourly bucket.
   */
  async recordBusinessSend(tenantId: string): Promise<void> {
    const phoneNumberId = await this.getPhoneNumberId(tenantId);
    if (!phoneNumberId) return;

    const bucketKey = this.currentBucketKey(phoneNumberId);
    await this.redis.incr(bucketKey);
    await this.redis.expire(bucketKey, QUOTA_BUCKET_TTL_SECONDS);
  }

  /**
   * Get the full quota status for a tenant.
   */
  async getQuotaStatus(tenantId: string): Promise<QuotaStatus> {
    const phoneNumberId = await this.getPhoneNumberId(tenantId);
    const tier = await this.getTenantTier(tenantId);
    const tierLimit = CONVERSATION_TIER_LIMITS[tier];

    if (!phoneNumberId) {
      return { businessSent24h: 0, tierLimit, remaining: tierLimit, tier };
    }

    const sent24h = await this.getRolling24hCount(phoneNumberId);
    const remaining = Math.max(0, tierLimit - sent24h);

    return { businessSent24h: sent24h, tierLimit, remaining, tier };
  }

  /**
   * Quick check: does the tenant have at least 1 conversation slot remaining?
   */
  async hasQuotaRemaining(tenantId: string): Promise<boolean> {
    const status = await this.getQuotaStatus(tenantId);
    if (status.tierLimit === Infinity) return true;
    return status.remaining > 0;
  }

  /**
   * Pre-launch check: can the campaign proceed given the out-of-window audience size?
   * Returns { canProceed, warning?, quotaStatus }.
   */
  async checkQuota(
    tenantId: string,
    outOfWindowCount: number,
  ): Promise<{
    canProceed: boolean;
    warning: string | null;
    quotaStatus: QuotaStatus;
  }> {
    const status = await this.getQuotaStatus(tenantId);

    if (status.tierLimit === Infinity) {
      return { canProceed: true, warning: null, quotaStatus: status };
    }

    if (outOfWindowCount <= status.remaining) {
      return { canProceed: true, warning: null, quotaStatus: status };
    }

    const overagePercent =
      ((outOfWindowCount - status.remaining) / status.tierLimit) * 100;

    if (overagePercent <= 10) {
      return {
        canProceed: true,
        warning: `Campaign audience (${outOfWindowCount} business-initiated) exceeds remaining quota (${status.remaining}) by ${overagePercent.toFixed(1)}%. Some messages may fail.`,
        quotaStatus: status,
      };
    }

    return {
      canProceed: false,
      warning: `Campaign audience (${outOfWindowCount} business-initiated) significantly exceeds remaining quota (${status.remaining}). Reduce audience or wait for quota to reset.`,
      quotaStatus: status,
    };
  }

  /**
   * Sum hourly buckets for the last 24 hours to get the rolling count.
   */
  private async getRolling24hCount(phoneNumberId: string): Promise<number> {
    const keys = this.last24HourBucketKeys(phoneNumberId);
    if (keys.length === 0) return 0;

    const values = await this.redis.mget(...keys);
    let total = 0;
    for (const v of values) {
      if (v !== null) total += parseInt(v, 10) || 0;
    }
    return total;
  }

  /**
   * Generate Redis keys for the last 24 hourly buckets.
   */
  private last24HourBucketKeys(phoneNumberId: string): string[] {
    const keys: string[] = [];
    const now = Date.now();
    for (let i = 0; i < 24; i++) {
      const bucketTime = new Date(now - i * 60 * 60 * 1000);
      keys.push(this.bucketKey(phoneNumberId, bucketTime));
    }
    return keys;
  }

  private currentBucketKey(phoneNumberId: string): string {
    return this.bucketKey(phoneNumberId, new Date());
  }

  private bucketKey(phoneNumberId: string, date: Date): string {
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, "0");
    const d = String(date.getUTCDate()).padStart(2, "0");
    const h = String(date.getUTCHours()).padStart(2, "0");
    return `${QUOTA_REDIS_KEY_PREFIX}:${phoneNumberId}:${y}${m}${d}${h}`;
  }

  /**
   * Get the WhatsApp phone number ID for a tenant's primary integration.
   */
  private async getPhoneNumberId(tenantId: string): Promise<string | null> {
    try {
      const integration = await this.crmService.getActiveIntegration(tenantId);
      return integration?.config?.phoneNumberId ?? null;
    } catch {
      return null;
    }
  }

  /**
   * Get the conversation tier for a tenant.
   * TODO: Store tier on the CRM integration config for per-tenant configuration.
   */
  private async getTenantTier(
    _tenantId: string,
  ): Promise<ConversationTier> {
    return DEFAULT_CONVERSATION_TIER;
  }
}
