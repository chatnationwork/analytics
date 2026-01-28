/**
 * =============================================================================
 * EVENT REPOSITORY
 * =============================================================================
 *
 * Data access layer for analytics events.
 *
 * PURPOSE:
 * -------
 * Provides methods for saving and querying events.
 * Controllers/services use this instead of raw SQL.
 *
 * KEY METHODS:
 * -----------
 * - save(): Insert a single event
 * - saveBatch(): Insert many events efficiently
 * - findBySessionId(): Get all events for a session
 * - countByEventName(): Count events for funnel analysis
 * - messageIdExists(): Check for duplicates
 */

import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, Between } from "typeorm";
import { EventEntity } from "../entities/event.entity";

/**
 * DTO for creating an event.
 *
 * WHAT IS A DTO?
 * -------------
 * Data Transfer Object - a simple object that carries data between layers.
 * We use this interface to define what data is needed to create an event.
 */
export interface CreateEventDto {
  eventId: string;
  messageId: string;
  tenantId: string;
  projectId: string;
  eventName: string;
  eventType?: string;
  timestamp: Date;
  anonymousId: string;
  userId?: string;
  sessionId: string;
  externalId?: string;
  channelType?: string;
  pagePath?: string;
  pageUrl?: string;
  pageTitle?: string;
  pageReferrer?: string;
  userAgent?: string;
  deviceType?: string;
  osName?: string;
  osVersion?: string;
  browserName?: string;
  browserVersion?: string;
  ipAddress?: string;
  countryCode?: string;
  city?: string;
  properties?: Record<string, unknown>;
  sdkVersion?: string;
}

/**
 * Repository for event data access.
 *
 * @Injectable() - Makes this class available for dependency injection.
 */
@Injectable()
export class EventRepository {
  /**
   * Constructor with repository injection.
   *
   * @InjectRepository(EventEntity)
   * -------------------------------
   * This is a TypeORM decorator that injects the TypeORM repository
   * for the EventEntity. It's registered when you call
   * TypeOrmModule.forFeature([EventEntity]).
   *
   * The Repository<EventEntity> provides basic CRUD operations.
   */
  constructor(
    @InjectRepository(EventEntity)
    private readonly repo: Repository<EventEntity>,
  ) {}

  /**
   * Save a single event to the database.
   *
   * @param event - Event data to save
   * @returns The saved entity (with any auto-generated fields)
   */
  async save(event: CreateEventDto): Promise<EventEntity> {
    // Create entity instance from plain object
    const entity = this.repo.create(event);
    // Save to database
    return this.repo.save(entity);
  }

  /**
   * Save multiple events in a single batch.
   *
   * BATCH INSERTS:
   * -------------
   * Inserting 100 rows one at a time = 100 database round trips
   * Inserting 100 rows in batch = 1 database round trip
   *
   * Much faster for high-volume ingestion!
   *
   * @param events - Array of events to save
   * @returns Array of saved entities
   */
  async saveBatch(events: CreateEventDto[]): Promise<EventEntity[]> {
    const entities = events.map((e) => this.repo.create(e));
    return this.repo.save(entities);
  }

  /**
   * Find an event by its ID.
   *
   * @param eventId - The event's UUID
   * @returns Event if found, null otherwise
   */
  async findById(eventId: string): Promise<EventEntity | null> {
    return this.repo.findOne({ where: { eventId } });
  }

  /**
   * Find event by message ID (for deduplication).
   *
   * @param messageId - The message UUID
   * @returns Event if found, null otherwise
   */
  async findByMessageId(messageId: string): Promise<EventEntity | null> {
    return this.repo.findOne({ where: { messageId } });
  }

  /**
   * Get all events for a specific session.
   *
   * Used by the Session Detail view to show an event timeline.
   * Events are sorted by timestamp (oldest first).
   *
   * @param sessionId - The session UUID
   * @returns Array of events in chronological order
   */
  async findBySessionId(sessionId: string): Promise<EventEntity[]> {
    return this.repo.find({
      where: { sessionId },
      order: { timestamp: "ASC" },
    });
  }

  /**
   * Get events for a tenant within a date range.
   *
   * @param tenantId - Tenant to filter by
   * @param startDate - Start of date range
   * @param endDate - End of date range
   * @param limit - Max events to return (default: 1000)
   * @returns Events sorted by timestamp (newest first)
   */
  async findByTenantAndDateRange(
    tenantId: string,
    startDate: Date,
    endDate: Date,
    limit = 1000,
  ): Promise<EventEntity[]> {
    return this.repo.find({
      where: {
        tenantId,
        // Between is a TypeORM operator for range queries
        timestamp: Between(startDate, endDate),
      },
      order: { timestamp: "DESC" },
      take: limit,
    });
  }

  /**
   * Count unique sessions for each event name.
   *
   * FUNNEL ANALYSIS:
   * ---------------
   * For funnel charts, we need to know how many users reached each step.
   * This query counts unique sessions (not event occurrences) per event type.
   *
   * Using COUNT(DISTINCT session_id) ensures:
   * - A user who viewed a page 5 times counts as 1
   * - We measure unique users, not repeat actions
   *
   * @param tenantId - Tenant to filter by
   * @param eventNames - List of event names to count
   * @param startDate - Start of date range
   * @param endDate - End of date range
   * @returns Array of { eventName, count } objects
   */
  async countByEventName(
    tenantId: string,
    eventNames: string[],
    startDate: Date,
    endDate: Date,
  ): Promise<{ eventName: string; count: number }[]> {
    /**
     * Query Builder
     * -------------
     * For complex queries, we use TypeORM's query builder.
     * It's like writing SQL but with TypeScript safety.
     */
    const result = await this.repo
      .createQueryBuilder("event")
      .select("event.eventName", "eventName")
      .addSelect("COUNT(DISTINCT event.sessionId)", "count")
      .where("event.tenantId = :tenantId", { tenantId })
      .andWhere("event.eventName IN (:...eventNames)", { eventNames })
      .andWhere("event.timestamp BETWEEN :startDate AND :endDate", {
        startDate,
        endDate,
      })
      .groupBy("event.eventName")
      .getRawMany();

    // Convert string counts to numbers
    return result.map((r) => ({
      eventName: r.eventName,
      count: parseInt(r.count, 10),
    }));
  }

  /**
   * Check if a message ID already exists (for deduplication).
   *
   * More efficient than findByMessageId when you only need to know
   * if it exists, not fetch the actual data.
   *
   * @param messageId - The message UUID to check
   * @returns true if exists, false otherwise
   */
  async messageIdExists(messageId: string): Promise<boolean> {
    const count = await this.repo.count({ where: { messageId } });
    return count > 0;
  }

  /**
   * Get distinct event names sorted by frequency.
   * Used for the funnel builder dropdown.
   */
  async getDistinctEventNames(tenantId: string): Promise<string[]> {
    const result = await this.repo
      .createQueryBuilder("event")
      .select("event.eventName", "eventName")
      .addSelect("COUNT(*)", "count")
      .where("event.tenantId = :tenantId", { tenantId })
      .groupBy("event.eventName")
      .orderBy("count", "DESC")
      .getRawMany();

    return result.map((r) => r.eventName);
  }

  /**
   * Get top page paths by visit count.
   * Used for "Traffic by Journey" visualization.
   */
  async getTopPagePaths(
    tenantId: string,
    startDate: Date,
    endDate: Date,
    limit = 15,
  ) {
    return this.repo
      .createQueryBuilder("event")
      .select("event.pagePath", "page_path")
      .addSelect("COUNT(*)", "count")
      .addSelect("COUNT(DISTINCT event.sessionId)", "unique_sessions")
      .where("event.tenantId = :tenantId", { tenantId })
      .andWhere("event.eventName = 'page_view'")
      .andWhere("event.timestamp BETWEEN :startDate AND :endDate", {
        startDate,
        endDate,
      })
      .andWhere("event.pagePath IS NOT NULL")
      .andWhere("event.pagePath != ''")
      .groupBy("event.pagePath")
      .orderBy("count", "DESC")
      .limit(limit)
      .getRawMany();
  }

  /**
   * Get WhatsApp specific performance stats.
   *
   * Note: "New Contacts" counts unique users who sent their FIRST message
   * within the date range (i.e., they had no messages before startDate).
   */
  async getWhatsappStats(tenantId: string, startDate: Date, endDate: Date) {
    // Base query for WhatsApp events in date range
    const qb = this.repo
      .createQueryBuilder("event")
      .where("event.tenantId = :tenantId", { tenantId })
      .andWhere(
        "event.channelType = 'whatsapp' OR event.eventName LIKE 'message.%'",
      )
      .andWhere("event.timestamp BETWEEN :startDate AND :endDate", {
        startDate,
        endDate,
      });

    // Count total messages received
    const receivedCount = await qb
      .clone()
      .andWhere("event.eventName = 'message.received'")
      .getCount();

    // Count total messages sent
    const sentCount = await qb
      .clone()
      .andWhere("event.eventName = 'message.sent'")
      .getCount();

    // Count messages that were read
    const readCount = await qb
      .clone()
      .andWhere("event.eventName = 'message.read'")
      .getCount();

    // Count unique contacts who sent messages in this period
    const uniqueContactsResult = await qb
      .clone()
      .select(
        "COUNT(DISTINCT COALESCE(event.userId, event.externalId))",
        "count",
      )
      .andWhere("event.eventName = 'message.received'")
      .getRawOne();
    const uniqueContacts = parseInt(uniqueContactsResult?.count, 10) || 0;

    // Count NEW contacts: users whose first message.received was within this date range
    // A user is "new" if they have no message.received events before startDate
    const newContactsResult = await this.repo.query(
      `
      WITH contacts_in_period AS (
        SELECT DISTINCT COALESCE("userId", "externalId") as contact_id
        FROM events
        WHERE "tenantId" = $1
          AND "eventName" = 'message.received'
          AND timestamp BETWEEN $2 AND $3
          AND (COALESCE("userId", "externalId")) IS NOT NULL
      ),
      contacts_with_history AS (
        SELECT DISTINCT COALESCE("userId", "externalId") as contact_id
        FROM events
        WHERE "tenantId" = $1
          AND "eventName" = 'message.received'
          AND timestamp < $2
          AND (COALESCE("userId", "externalId")) IS NOT NULL
      )
      SELECT COUNT(*) as new_contacts
      FROM contacts_in_period
      WHERE contact_id NOT IN (SELECT contact_id FROM contacts_with_history)
      `,
      [tenantId, startDate, endDate],
    );
    const newContactsCount =
      parseInt(newContactsResult[0]?.new_contacts, 10) || 0;

    return {
      messagesReceived: receivedCount,
      messagesSent: sentCount,
      messagesRead: readCount,
      newContacts: newContactsCount,
      uniqueContacts, // Also return unique contacts for reference
      readRate: sentCount > 0 ? (readCount / sentCount) * 100 : 0,
    };
  }

  async getWhatsappVolumeByHour(
    tenantId: string,
    startDate: Date,
    endDate: Date,
  ) {
    // Postgres specific date extraction
    return this.repo
      .createQueryBuilder("event")
      .select("EXTRACT(HOUR FROM event.timestamp)", "hour")
      .addSelect("COUNT(*)", "count")
      .where("event.tenantId = :tenantId", { tenantId })
      .andWhere("event.eventName = 'message.received'")
      .andWhere("event.timestamp BETWEEN :startDate AND :endDate", {
        startDate,
        endDate,
      })
      .groupBy("hour")
      .orderBy("hour", "ASC")
      .getRawMany();
  }

  async getWhatsappHeatmap(tenantId: string, startDate: Date, endDate: Date) {
    // Postgres: 0 = Sunday, 1 = Monday, etc.
    return this.repo
      .createQueryBuilder("event")
      .select("EXTRACT(DOW FROM event.timestamp)", "day")
      .addSelect("EXTRACT(HOUR FROM event.timestamp)", "hour")
      .addSelect("COUNT(*)", "count")
      .where("event.tenantId = :tenantId", { tenantId })
      .andWhere("event.eventName = 'message.received'")
      .andWhere("event.timestamp BETWEEN :startDate AND :endDate", {
        startDate,
        endDate,
      })
      .groupBy("day")
      .addGroupBy("hour")
      .getRawMany();
  }

  async getWhatsappAgentPerformance(
    tenantId: string,
    startDate: Date,
    endDate: Date,
  ) {
    return this.repo
      .createQueryBuilder("event")
      .select("event.properties ->> 'agentId'", "agent_id")
      .addSelect("COUNT(*)", "chat_count")
      .where("event.tenantId = :tenantId", { tenantId })
      .andWhere("event.eventName = 'chat.resolved'")
      .andWhere("event.timestamp BETWEEN :startDate AND :endDate", {
        startDate,
        endDate,
      })
      .andWhere("event.properties ->> 'agentId' IS NOT NULL")
      .groupBy("agent_id")
      .orderBy("chat_count", "DESC")
      .limit(10)
      .getRawMany();
  }

  /**
   * Get message volume by country code.
   * Used for "Traffic per Country" visualization.
   */
  async getWhatsappCountryBreakdown(
    tenantId: string,
    startDate: Date,
    endDate: Date,
  ) {
    return this.repo
      .createQueryBuilder("event")
      .select("event.countryCode", "country_code")
      .addSelect("COUNT(*)", "count")
      .where("event.tenantId = :tenantId", { tenantId })
      .andWhere("event.eventName = 'message.received'")
      .andWhere("event.timestamp BETWEEN :startDate AND :endDate", {
        startDate,
        endDate,
      })
      .andWhere("event.countryCode IS NOT NULL")
      .groupBy("event.countryCode")
      .orderBy("count", "DESC")
      .limit(20)
      .getRawMany();
  }

  /**
   * Calculate average response time (time between message.received and next message.sent).
   * Returns distribution buckets for histogram.
   */
  async getWhatsappResponseTime(
    tenantId: string,
    startDate: Date,
    endDate: Date,
  ) {
    // This query calculates the time difference between received and sent messages per user
    // and returns a distribution of response times in minute buckets
    const result = await this.repo.query(
      `
      WITH received AS (
        SELECT 
          properties->>'userId' as user_id,
          timestamp as received_at,
          ROW_NUMBER() OVER (PARTITION BY properties->>'userId' ORDER BY timestamp) as rn
        FROM events
        WHERE "tenantId" = $1
          AND "eventName" = 'message.received'
          AND timestamp BETWEEN $2 AND $3
      ),
      sent AS (
        SELECT 
          properties->>'userId' as user_id,
          timestamp as sent_at,
          ROW_NUMBER() OVER (PARTITION BY properties->>'userId' ORDER BY timestamp) as rn
        FROM events
        WHERE "tenantId" = $1
          AND "eventName" = 'message.sent'
          AND timestamp BETWEEN $2 AND $3
      ),
      response_times AS (
        SELECT 
          EXTRACT(EPOCH FROM (s.sent_at - r.received_at)) / 60 as response_minutes
        FROM received r
        JOIN sent s ON r.user_id = s.user_id AND s.rn = r.rn
        WHERE s.sent_at > r.received_at
      )
      SELECT 
        CASE 
          WHEN response_minutes < 1 THEN '0-1'
          WHEN response_minutes < 2 THEN '1-2'
          WHEN response_minutes < 3 THEN '2-3'
          WHEN response_minutes < 4 THEN '3-4'
          WHEN response_minutes < 5 THEN '4-5'
          WHEN response_minutes < 6 THEN '5-6'
          WHEN response_minutes < 7 THEN '6-7'
          WHEN response_minutes < 8 THEN '7-8'
          WHEN response_minutes < 9 THEN '8-9'
          ELSE '9+'
        END as bucket,
        COUNT(*) as count,
        AVG(response_minutes) as avg_minutes
      FROM response_times
      GROUP BY bucket
      ORDER BY bucket
    `,
      [tenantId, startDate, endDate],
    );

    // Also calculate overall median
    const medianResult = await this.repo.query(
      `
      WITH response_times AS (
        SELECT 
          EXTRACT(EPOCH FROM (s.timestamp - r.timestamp)) / 60 as response_minutes
        FROM events r
        JOIN events s ON r.properties->>'userId' = s.properties->>'userId'
        WHERE r."tenantId" = $1
          AND r."eventName" = 'message.received'
          AND s."eventName" = 'message.sent'
          AND s.timestamp > r.timestamp
          AND r.timestamp BETWEEN $2 AND $3
      )
      SELECT PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY response_minutes) as median
      FROM response_times
    `,
      [tenantId, startDate, endDate],
    );

    return {
      distribution: result,
      medianMinutes: medianResult[0]?.median ?? null,
    };
  }

  /**
   * Get message funnel: Sent -> Delivered -> Read -> Replied.
   */
  async getWhatsappFunnel(tenantId: string, startDate: Date, endDate: Date) {
    const qb = this.repo
      .createQueryBuilder("event")
      .where("event.tenantId = :tenantId", { tenantId })
      .andWhere("event.timestamp BETWEEN :startDate AND :endDate", {
        startDate,
        endDate,
      });

    const sent = await qb
      .clone()
      .andWhere("event.eventName = 'message.sent'")
      .getCount();
    const delivered = await qb
      .clone()
      .andWhere("event.eventName = 'message.delivered'")
      .getCount();
    const read = await qb
      .clone()
      .andWhere("event.eventName = 'message.read'")
      .getCount();
    const replied = await qb
      .clone()
      .andWhere("event.eventName = 'message.received'")
      .getCount();

    return {
      funnel: [
        { stage: "Sent", count: sent },
        { stage: "Delivered", count: delivered },
        { stage: "Read", count: read },
        { stage: "Replied", count: replied },
      ],
      rates: {
        deliveryRate: sent > 0 ? (delivered / sent) * 100 : 0,
        readRate: delivered > 0 ? (read / delivered) * 100 : 0,
        replyRate: read > 0 ? (replied / read) * 100 : 0,
      },
    };
  }

  // =============================================================================
  // AI ANALYTICS METHODS
  // =============================================================================

  /**
   * Get AI performance stats: total classifications, avg latency, avg confidence, error rate.
   */
  async getAiStats(tenantId: string, startDate: Date, endDate: Date) {
    const result = await this.repo
      .createQueryBuilder("event")
      .select("COUNT(*)", "totalClassifications")
      .addSelect(
        "AVG((event.properties->>'latency_ms')::float)",
        "avgLatencyMs",
      )
      .addSelect(
        "AVG((event.properties->>'confidence')::float)",
        "avgConfidence",
      )
      .where("event.tenantId = :tenantId", { tenantId })
      .andWhere("event.timestamp BETWEEN :startDate AND :endDate", {
        startDate,
        endDate,
      })
      .andWhere("event.eventName = 'ai.classification'")
      .getRawOne();

    const errorCount = await this.repo
      .createQueryBuilder("event")
      .where("event.tenantId = :tenantId", { tenantId })
      .andWhere("event.timestamp BETWEEN :startDate AND :endDate", {
        startDate,
        endDate,
      })
      .andWhere("event.eventName = 'ai.error'")
      .getCount();

    const totalClassifications = parseInt(result.totalClassifications, 10) || 0;

    return {
      totalClassifications,
      avgLatencyMs: parseFloat(result.avgLatencyMs) || 0,
      avgConfidence: parseFloat(result.avgConfidence) || 0,
      errorCount,
      errorRate:
        totalClassifications > 0
          ? (errorCount / totalClassifications) * 100
          : 0,
    };
  }

  /**
   * Get intent breakdown: top intents by count with average confidence.
   */
  async getAiIntentBreakdown(
    tenantId: string,
    startDate: Date,
    endDate: Date,
    limit = 10,
  ) {
    const result = await this.repo
      .createQueryBuilder("event")
      .select("event.properties->>'detected_intent'", "intent")
      .addSelect("COUNT(*)", "count")
      .addSelect(
        "AVG((event.properties->>'confidence')::float)",
        "avgConfidence",
      )
      .where("event.tenantId = :tenantId", { tenantId })
      .andWhere("event.timestamp BETWEEN :startDate AND :endDate", {
        startDate,
        endDate,
      })
      .andWhere("event.eventName = 'ai.classification'")
      .andWhere("event.properties->>'detected_intent' IS NOT NULL")
      .groupBy("event.properties->>'detected_intent'")
      .orderBy("COUNT(*)", "DESC")
      .limit(limit)
      .getRawMany();

    return result.map((r) => ({
      intent: r.intent,
      count: parseInt(r.count, 10),
      avgConfidence: parseFloat(r.avgConfidence) || 0,
    }));
  }

  /**
   * Get AI latency distribution in buckets.
   */
  async getAiLatencyDistribution(
    tenantId: string,
    startDate: Date,
    endDate: Date,
  ) {
    const buckets = [
      { min: 0, max: 100, label: "0-100" },
      { min: 100, max: 200, label: "100-200" },
      { min: 200, max: 500, label: "200-500" },
      { min: 500, max: 1000, label: "500-1000" },
      { min: 1000, max: 999999, label: "1000+" },
    ];

    const result = await Promise.all(
      buckets.map(async (bucket) => {
        const count = await this.repo
          .createQueryBuilder("event")
          .where("event.tenantId = :tenantId", { tenantId })
          .andWhere("event.timestamp BETWEEN :startDate AND :endDate", {
            startDate,
            endDate,
          })
          .andWhere("event.eventName = 'ai.classification'")
          .andWhere("(event.properties->>'latency_ms')::int >= :min", {
            min: bucket.min,
          })
          .andWhere("(event.properties->>'latency_ms')::int < :max", {
            max: bucket.max,
          })
          .getCount();
        return { bucket: bucket.label, count };
      }),
    );

    return result;
  }

  /**
   * Get AI error breakdown by error type.
   */
  async getAiErrorBreakdown(tenantId: string, startDate: Date, endDate: Date) {
    const result = await this.repo
      .createQueryBuilder("event")
      .select("event.properties->>'error_type'", "errorType")
      .addSelect("COUNT(*)", "count")
      .addSelect(
        "SUM(CASE WHEN (event.properties->>'recovered')::boolean = true THEN 1 ELSE 0 END)",
        "recoveredCount",
      )
      .where("event.tenantId = :tenantId", { tenantId })
      .andWhere("event.timestamp BETWEEN :startDate AND :endDate", {
        startDate,
        endDate,
      })
      .andWhere("event.eventName = 'ai.error'")
      .groupBy("event.properties->>'error_type'")
      .orderBy("COUNT(*)", "DESC")
      .getRawMany();

    return result.map((r) => ({
      errorType: r.errorType || "unknown",
      count: parseInt(r.count, 10),
      recoveredCount: parseInt(r.recoveredCount, 10) || 0,
    }));
  }

  // =============================================================================
  // DASHBOARD ENHANCEMENT METHODS
  // =============================================================================

  /**
   * Get device type breakdown (Desktop, Mobile, Tablet).
   */
  async getDeviceBreakdown(tenantId: string, startDate: Date, endDate: Date) {
    const result = await this.repo
      .createQueryBuilder("event")
      .select("event.deviceType", "deviceType")
      .addSelect("COUNT(DISTINCT event.sessionId)", "count")
      .where("event.tenantId = :tenantId", { tenantId })
      .andWhere("event.timestamp BETWEEN :startDate AND :endDate", {
        startDate,
        endDate,
      })
      .andWhere("event.deviceType IS NOT NULL")
      .groupBy("event.deviceType")
      .orderBy("COUNT(DISTINCT event.sessionId)", "DESC")
      .getRawMany();

    return result.map((r) => ({
      deviceType: r.deviceType || "unknown",
      count: parseInt(r.count, 10),
    }));
  }

  /**
   * Get browser breakdown.
   */
  async getBrowserBreakdown(tenantId: string, startDate: Date, endDate: Date) {
    const result = await this.repo
      .createQueryBuilder("event")
      .select("event.browserName", "browserName")
      .addSelect("COUNT(DISTINCT event.sessionId)", "count")
      .where("event.tenantId = :tenantId", { tenantId })
      .andWhere("event.timestamp BETWEEN :startDate AND :endDate", {
        startDate,
        endDate,
      })
      .andWhere("event.browserName IS NOT NULL")
      .groupBy("event.browserName")
      .orderBy("COUNT(DISTINCT event.sessionId)", "DESC")
      .limit(10)
      .getRawMany();

    return result.map((r) => ({
      browserName: r.browserName || "unknown",
      count: parseInt(r.count, 10),
    }));
  }

  /**
   * Get daily active users (unique anonymousIds per day).
   */
  async getDailyActiveUsers(tenantId: string, startDate: Date, endDate: Date) {
    const result = await this.repo
      .createQueryBuilder("event")
      .select("DATE_TRUNC('day', event.timestamp)", "date")
      .addSelect("COUNT(DISTINCT event.anonymousId)", "count")
      .where("event.tenantId = :tenantId", { tenantId })
      .andWhere("event.timestamp BETWEEN :startDate AND :endDate", {
        startDate,
        endDate,
      })
      .groupBy("DATE_TRUNC('day', event.timestamp)")
      .orderBy("DATE_TRUNC('day', event.timestamp)", "ASC")
      .getRawMany();

    return result.map((r) => ({
      date: r.date,
      count: parseInt(r.count, 10),
    }));
  }

  /**
   * Get identified vs anonymous user counts.
   */
  async getIdentifiedVsAnonymous(
    tenantId: string,
    startDate: Date,
    endDate: Date,
  ) {
    const result = await this.repo
      .createQueryBuilder("event")
      .select("COUNT(DISTINCT event.anonymousId)", "totalUsers")
      .addSelect(
        "COUNT(DISTINCT CASE WHEN event.userId IS NOT NULL THEN event.anonymousId END)",
        "identifiedUsers",
      )
      .where("event.tenantId = :tenantId", { tenantId })
      .andWhere("event.timestamp BETWEEN :startDate AND :endDate", {
        startDate,
        endDate,
      })
      .getRawOne();

    const total = parseInt(result.totalUsers, 10) || 0;
    const identified = parseInt(result.identifiedUsers, 10) || 0;

    return {
      total,
      identified,
      anonymous: total - identified,
      identifiedPercent: total > 0 ? (identified / total) * 100 : 0,
    };
  }

  /**
   * Get WhatsApp resolution time stats from chat.resolved events.
   */
  async getResolutionTimeStats(
    tenantId: string,
    startDate: Date,
    endDate: Date,
  ) {
    const result = await this.repo
      .createQueryBuilder("event")
      .select(
        "AVG((event.properties->>'durationMinutes')::float)",
        "avgDuration",
      )
      .addSelect(
        "MIN((event.properties->>'durationMinutes')::float)",
        "minDuration",
      )
      .addSelect(
        "MAX((event.properties->>'durationMinutes')::float)",
        "maxDuration",
      )
      .addSelect("COUNT(*)", "totalResolved")
      .where("event.tenantId = :tenantId", { tenantId })
      .andWhere("event.timestamp BETWEEN :startDate AND :endDate", {
        startDate,
        endDate,
      })
      .andWhere("event.eventName = 'chat.resolved'")
      .getRawOne();

    return {
      avgDurationMinutes: parseFloat(result.avgDuration) || 0,
      minDurationMinutes: parseFloat(result.minDuration) || 0,
      maxDurationMinutes: parseFloat(result.maxDuration) || 0,
      totalResolved: parseInt(result.totalResolved, 10) || 0,
    };
  }

  /**
   * Get conversation length distribution (message count histogram).
   */
  async getConversationLengthDistribution(
    tenantId: string,
    startDate: Date,
    endDate: Date,
  ) {
    const buckets = [
      { min: 1, max: 3, label: "1-3" },
      { min: 4, max: 6, label: "4-6" },
      { min: 7, max: 10, label: "7-10" },
      { min: 11, max: 20, label: "11-20" },
      { min: 21, max: 999999, label: "20+" },
    ];

    const result = await Promise.all(
      buckets.map(async (bucket) => {
        const count = await this.repo
          .createQueryBuilder("event")
          .where("event.tenantId = :tenantId", { tenantId })
          .andWhere("event.timestamp BETWEEN :startDate AND :endDate", {
            startDate,
            endDate,
          })
          .andWhere("event.eventName = 'chat.resolved'")
          .andWhere("(event.properties->>'messageCount')::int >= :min", {
            min: bucket.min,
          })
          .andWhere("(event.properties->>'messageCount')::int <= :max", {
            max: bucket.max,
          })
          .getCount();
        return { bucket: bucket.label, count };
      }),
    );

    return result;
  }

  /**
   * Get all events for a user by userId or anonymousId.
   * Returns events across all their sessions, sorted by timestamp.
   */
  async findByUserOrAnonymousId(
    tenantId: string,
    id: string,
    type: "userId" | "anonymousId",
    limit = 500,
  ): Promise<EventEntity[]> {
    const whereClause =
      type === "userId"
        ? { tenantId, userId: id }
        : { tenantId, anonymousId: id };

    return this.repo.find({
      where: whereClause,
      order: { timestamp: "DESC" },
      take: limit,
    });
  }

  // =============================================================================
  // WHATSAPP TREND ANALYTICS METHODS
  // =============================================================================

  /**
   * Get WhatsApp message volume trend (received vs sent) over time.
   */
  async getWhatsappMessageVolumeTrend(
    tenantId: string,
    startDate: Date,
    endDate: Date,
    granularity: "day" | "week" | "month" = "day",
  ) {
    const result = await this.repo.query(
      `
      SELECT 
        DATE_TRUNC($4, timestamp) as period,
        SUM(CASE WHEN "eventName" = 'message.received' THEN 1 ELSE 0 END) as received,
        SUM(CASE WHEN "eventName" = 'message.sent' THEN 1 ELSE 0 END) as sent
      FROM events
      WHERE "tenantId" = $1
        AND "eventName" IN ('message.received', 'message.sent')
        AND timestamp BETWEEN $2 AND $3
      GROUP BY DATE_TRUNC($4, timestamp)
      ORDER BY period ASC
      `,
      [tenantId, startDate, endDate, granularity],
    );

    return result.map((r: any) => ({
      period: r.period,
      received: parseInt(r.received, 10) || 0,
      sent: parseInt(r.sent, 10) || 0,
    }));
  }

  /**
   * Get WhatsApp response time trend (median per period).
   */
  async getWhatsappResponseTimeTrend(
    tenantId: string,
    startDate: Date,
    endDate: Date,
    granularity: "day" | "week" | "month" = "day",
  ) {
    // Calculate median response time per period
    const result = await this.repo.query(
      `
      WITH response_pairs AS (
        SELECT 
          r.timestamp as received_at,
          s.timestamp as sent_at,
          EXTRACT(EPOCH FROM (s.timestamp - r.timestamp)) / 60 as response_minutes
        FROM events r
        JOIN events s ON 
          r."tenantId" = s."tenantId"
          AND COALESCE(r."userId", r."externalId") = COALESCE(s."userId", s."externalId")
          AND s.timestamp > r.timestamp
          AND s.timestamp < r.timestamp + INTERVAL '30 minutes'
        WHERE r."tenantId" = $1
          AND r."eventName" = 'message.received'
          AND s."eventName" = 'message.sent'
          AND r.timestamp BETWEEN $2 AND $3
      )
      SELECT 
        DATE_TRUNC($4, received_at) as period,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY response_minutes) as median_minutes,
        PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY response_minutes) as p95_minutes,
        COUNT(*) as response_count
      FROM response_pairs
      WHERE response_minutes > 0
      GROUP BY DATE_TRUNC($4, received_at)
      ORDER BY period ASC
      `,
      [tenantId, startDate, endDate, granularity],
    );

    return result.map((r: any) => ({
      period: r.period,
      medianMinutes: parseFloat(r.median_minutes) || 0,
      p95Minutes: parseFloat(r.p95_minutes) || 0,
      responseCount: parseInt(r.response_count, 10) || 0,
    }));
  }

  /**
   * Get WhatsApp read rate trend over time.
   */
  async getWhatsappReadRateTrend(
    tenantId: string,
    startDate: Date,
    endDate: Date,
    granularity: "day" | "week" | "month" = "day",
  ) {
    const result = await this.repo.query(
      `
      SELECT 
        DATE_TRUNC($4, timestamp) as period,
        SUM(CASE WHEN "eventName" = 'message.sent' THEN 1 ELSE 0 END) as sent,
        SUM(CASE WHEN "eventName" = 'message.read' THEN 1 ELSE 0 END) as read_count
      FROM events
      WHERE "tenantId" = $1
        AND "eventName" IN ('message.sent', 'message.read')
        AND timestamp BETWEEN $2 AND $3
      GROUP BY DATE_TRUNC($4, timestamp)
      ORDER BY period ASC
      `,
      [tenantId, startDate, endDate, granularity],
    );

    return result.map((r: any) => {
      const sent = parseInt(r.sent, 10) || 0;
      const readCount = parseInt(r.read_count, 10) || 0;
      return {
        period: r.period,
        sent,
        readCount,
        readRate: sent > 0 ? (readCount / sent) * 100 : 0,
      };
    });
  }

  /**
   * Get WhatsApp new contacts trend over time.
   * Counts unique contacts whose first message was in each period.
   */
  async getWhatsappNewContactsTrend(
    tenantId: string,
    startDate: Date,
    endDate: Date,
    granularity: "day" | "week" | "month" = "day",
  ) {
    const result = await this.repo.query(
      `
      WITH first_contact AS (
        SELECT 
          COALESCE("userId", "externalId") as contact_id,
          MIN(timestamp) as first_message_at
        FROM events
        WHERE "tenantId" = $1
          AND "eventName" = 'message.received'
          AND COALESCE("userId", "externalId") IS NOT NULL
        GROUP BY COALESCE("userId", "externalId")
      )
      SELECT 
        DATE_TRUNC($4, first_message_at) as period,
        COUNT(*) as new_contacts
      FROM first_contact
      WHERE first_message_at BETWEEN $2 AND $3
      GROUP BY DATE_TRUNC($4, first_message_at)
      ORDER BY period ASC
      `,
      [tenantId, startDate, endDate, granularity],
    );

    return result.map((r: any) => ({
      period: r.period,
      newContacts: parseInt(r.new_contacts, 10) || 0,
    }));
  }

  /**
   * Get WhatsApp delivery funnel trend over time.
   */
  async getWhatsappFunnelTrend(
    tenantId: string,
    startDate: Date,
    endDate: Date,
    granularity: "day" | "week" | "month" = "day",
  ) {
    const result = await this.repo.query(
      `
      SELECT 
        DATE_TRUNC($4, timestamp) as period,
        SUM(CASE WHEN "eventName" = 'message.sent' THEN 1 ELSE 0 END) as sent,
        SUM(CASE WHEN "eventName" = 'message.delivered' THEN 1 ELSE 0 END) as delivered,
        SUM(CASE WHEN "eventName" = 'message.read' THEN 1 ELSE 0 END) as read_count,
        SUM(CASE WHEN "eventName" = 'message.received' THEN 1 ELSE 0 END) as replied
      FROM events
      WHERE "tenantId" = $1
        AND "eventName" IN ('message.sent', 'message.delivered', 'message.read', 'message.received')
        AND timestamp BETWEEN $2 AND $3
      GROUP BY DATE_TRUNC($4, timestamp)
      ORDER BY period ASC
      `,
      [tenantId, startDate, endDate, granularity],
    );

    return result.map((r: any) => {
      const sent = parseInt(r.sent, 10) || 0;
      const delivered = parseInt(r.delivered, 10) || 0;
      const readCount = parseInt(r.read_count, 10) || 0;
      const replied = parseInt(r.replied, 10) || 0;

      return {
        period: r.period,
        sent,
        delivered,
        readCount,
        replied,
        deliveryRate: sent > 0 ? (delivered / sent) * 100 : 0,
        readRate: delivered > 0 ? (readCount / delivered) * 100 : 0,
        replyRate: readCount > 0 ? (replied / readCount) * 100 : 0,
      };
    });
  }

  // ===========================================================================
  // SELF-SERVE VS ASSISTED JOURNEY ANALYTICS
  // ===========================================================================

  /**
   * Get self-serve vs assisted journey breakdown.
   * Self-serve = sessions that never had an agent.handoff event
   * Assisted = sessions that had at least one agent.handoff event
   */
  async getSelfServeVsAssistedStats(
    tenantId: string,
    startDate: Date,
    endDate: Date,
  ) {
    // First, get all unique sessions in the period
    const totalSessionsResult = await this.repo.query(
      `
      SELECT COUNT(DISTINCT "sessionId") as total_sessions
      FROM events
      WHERE "tenantId" = $1
        AND timestamp BETWEEN $2 AND $3
        AND "sessionId" IS NOT NULL
      `,
      [tenantId, startDate, endDate],
    );

    // Then, get sessions that had a handoff
    const assistedSessionsResult = await this.repo.query(
      `
      SELECT COUNT(DISTINCT "sessionId") as assisted_sessions
      FROM events
      WHERE "tenantId" = $1
        AND "eventName" = 'agent.handoff'
        AND timestamp BETWEEN $2 AND $3
        AND "sessionId" IS NOT NULL
      `,
      [tenantId, startDate, endDate],
    );

    const totalSessions =
      parseInt(totalSessionsResult[0]?.total_sessions, 10) || 0;
    const assistedSessions =
      parseInt(assistedSessionsResult[0]?.assisted_sessions, 10) || 0;
    const selfServeSessions = totalSessions - assistedSessions;

    return {
      totalSessions,
      selfServeSessions,
      assistedSessions,
      selfServeRate:
        totalSessions > 0 ? (selfServeSessions / totalSessions) * 100 : 0,
      assistedRate:
        totalSessions > 0 ? (assistedSessions / totalSessions) * 100 : 0,
    };
  }

  /**
   * Get handoff rate grouped by journey step/reason.
   * Shows which steps or issues most commonly lead to agent handoff.
   */
  async getHandoffByStep(tenantId: string, startDate: Date, endDate: Date) {
    const result = await this.repo.query(
      `
      SELECT 
        COALESCE(properties->>'journeyStep', properties->>'handoffReason', 'unknown') as step,
        COUNT(*) as handoffs
      FROM events
      WHERE "tenantId" = $1
        AND "eventName" = 'agent.handoff'
        AND timestamp BETWEEN $2 AND $3
      GROUP BY COALESCE(properties->>'journeyStep', properties->>'handoffReason', 'unknown')
      ORDER BY handoffs DESC
      LIMIT 20
      `,
      [tenantId, startDate, endDate],
    );

    return result.map((r: any) => ({
      step: r.step,
      handoffs: parseInt(r.handoffs, 10) || 0,
    }));
  }

  /**
   * Get handoff rate trend over time.
   */
  async getHandoffRateTrend(
    tenantId: string,
    startDate: Date,
    endDate: Date,
    granularity: "day" | "week" | "month" = "day",
  ) {
    // Get total sessions per period
    const sessionsResult = await this.repo.query(
      `
      SELECT 
        DATE_TRUNC($4, timestamp) as period,
        COUNT(DISTINCT "sessionId") as total_sessions
      FROM events
      WHERE "tenantId" = $1
        AND timestamp BETWEEN $2 AND $3
        AND "sessionId" IS NOT NULL
      GROUP BY DATE_TRUNC($4, timestamp)
      ORDER BY period ASC
      `,
      [tenantId, startDate, endDate, granularity],
    );

    // Get handoffs per period
    const handoffsResult = await this.repo.query(
      `
      SELECT 
        DATE_TRUNC($4, timestamp) as period,
        COUNT(*) as handoffs
      FROM events
      WHERE "tenantId" = $1
        AND "eventName" = 'agent.handoff'
        AND timestamp BETWEEN $2 AND $3
      GROUP BY DATE_TRUNC($4, timestamp)
      ORDER BY period ASC
      `,
      [tenantId, startDate, endDate, granularity],
    );

    // Combine into a map
    const sessionsMap = new Map<string, number>();
    sessionsResult.forEach((r: any) => {
      sessionsMap.set(
        r.period.toISOString(),
        parseInt(r.total_sessions, 10) || 0,
      );
    });

    const handoffsMap = new Map<string, number>();
    handoffsResult.forEach((r: any) => {
      handoffsMap.set(r.period.toISOString(), parseInt(r.handoffs, 10) || 0);
    });

    // Merge the results
    const periods = new Set([...sessionsMap.keys(), ...handoffsMap.keys()]);
    const data = Array.from(periods)
      .sort()
      .map((period) => {
        const totalSessions = sessionsMap.get(period) || 0;
        const handoffs = handoffsMap.get(period) || 0;
        const selfServe = totalSessions - handoffs;
        return {
          period: new Date(period),
          totalSessions,
          selfServe,
          assisted: handoffs,
          handoffRate: totalSessions > 0 ? (handoffs / totalSessions) * 100 : 0,
          selfServeRate:
            totalSessions > 0 ? (selfServe / totalSessions) * 100 : 0,
        };
      });

    return data;
  }

  /**
   * Get agent performance stats for assisted sessions.
   * Shows how agents are performing in handling handoffs.
   */
  async getAgentHandoffStats(tenantId: string, startDate: Date, endDate: Date) {
    const result = await this.repo.query(
      `
      SELECT 
        properties->>'agentId' as agent_id,
        COUNT(*) as total_handoffs,
        COUNT(DISTINCT "sessionId") as unique_sessions
      FROM events
      WHERE "tenantId" = $1
        AND "eventName" = 'agent.handoff'
        AND timestamp BETWEEN $2 AND $3
        AND properties->>'agentId' IS NOT NULL
      GROUP BY properties->>'agentId'
      ORDER BY total_handoffs DESC
      `,
      [tenantId, startDate, endDate],
    );

    return result.map((r: any) => ({
      agentId: r.agent_id,
      totalHandoffs: parseInt(r.total_handoffs, 10) || 0,
      uniqueSessions: parseInt(r.unique_sessions, 10) || 0,
    }));
  }

  /**
   * Get average time to handoff (how long users wait before being transferred).
   */
  async getTimeToHandoff(tenantId: string, startDate: Date, endDate: Date) {
    // This requires correlating the handoff event with session start
    // For now, we calculate based on handoff events that have session context
    const result = await this.repo.query(
      `
      WITH session_starts AS (
        SELECT 
          "sessionId",
          MIN(timestamp) as session_start
        FROM events
        WHERE "tenantId" = $1
          AND timestamp BETWEEN $2 AND $3
          AND "sessionId" IS NOT NULL
        GROUP BY "sessionId"
      ),
      handoffs AS (
        SELECT 
          "sessionId",
          MIN(timestamp) as handoff_time
        FROM events
        WHERE "tenantId" = $1
          AND "eventName" = 'agent.handoff'
          AND timestamp BETWEEN $2 AND $3
          AND "sessionId" IS NOT NULL
        GROUP BY "sessionId"
      )
      SELECT 
        AVG(EXTRACT(EPOCH FROM (h.handoff_time - s.session_start))) as avg_seconds,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (h.handoff_time - s.session_start))) as median_seconds,
        PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (h.handoff_time - s.session_start))) as p95_seconds,
        COUNT(*) as handoff_count
      FROM handoffs h
      JOIN session_starts s ON h."sessionId" = s."sessionId"
      `,
      [tenantId, startDate, endDate],
    );

    const row = result[0] || {};
    return {
      avgSeconds: parseFloat(row.avg_seconds) || 0,
      medianSeconds: parseFloat(row.median_seconds) || 0,
      p95Seconds: parseFloat(row.p95_seconds) || 0,
      handoffCount: parseInt(row.handoff_count, 10) || 0,
    };
  }

  /**
   * Get handoff reasons breakdown.
   */
  async getHandoffReasons(tenantId: string, startDate: Date, endDate: Date) {
    const result = await this.repo.query(
      `
      SELECT 
        COALESCE(properties->>'handoffReason', 'unknown') as reason,
        COUNT(*) as count
      FROM events
      WHERE "tenantId" = $1
        AND "eventName" = 'agent.handoff'
        AND timestamp BETWEEN $2 AND $3
      GROUP BY COALESCE(properties->>'handoffReason', 'unknown')
      ORDER BY count DESC
      `,
      [tenantId, startDate, endDate],
    );

    return result.map((r: any) => ({
      reason: r.reason,
      count: parseInt(r.count, 10) || 0,
    }));
  }

  // ===========================================================================
  // AI ANALYTICS TRENDS
  // ===========================================================================

  /**
   * Get AI classification volume trend over time.
   */
  async getAiClassificationTrend(
    tenantId: string,
    startDate: Date,
    endDate: Date,
    granularity: "day" | "week" | "month" = "day",
  ) {
    const result = await this.repo.query(
      `
      SELECT 
        DATE_TRUNC($4, timestamp) as period,
        COUNT(*) FILTER (WHERE "eventName" = 'ai.classification') as classifications,
        COUNT(*) FILTER (WHERE "eventName" = 'ai.error') as errors
      FROM events
      WHERE "tenantId" = $1
        AND "eventName" IN ('ai.classification', 'ai.error')
        AND timestamp BETWEEN $2 AND $3
      GROUP BY DATE_TRUNC($4, timestamp)
      ORDER BY period ASC
      `,
      [tenantId, startDate, endDate, granularity],
    );

    return result.map((r: any) => {
      const classifications = parseInt(r.classifications, 10) || 0;
      const errors = parseInt(r.errors, 10) || 0;
      return {
        period: r.period,
        classifications,
        errors,
        errorRate: classifications > 0 ? (errors / classifications) * 100 : 0,
      };
    });
  }

  /**
   * Get AI latency trend over time (p50, p95, avg).
   */
  async getAiLatencyTrend(
    tenantId: string,
    startDate: Date,
    endDate: Date,
    granularity: "day" | "week" | "month" = "day",
  ) {
    const result = await this.repo.query(
      `
      SELECT 
        DATE_TRUNC($4, timestamp) as period,
        AVG((properties->>'latency_ms')::float) as avg_latency,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY (properties->>'latency_ms')::float) as p50_latency,
        PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY (properties->>'latency_ms')::float) as p95_latency,
        COUNT(*) as sample_count
      FROM events
      WHERE "tenantId" = $1
        AND "eventName" = 'ai.classification'
        AND timestamp BETWEEN $2 AND $3
        AND properties->>'latency_ms' IS NOT NULL
      GROUP BY DATE_TRUNC($4, timestamp)
      ORDER BY period ASC
      `,
      [tenantId, startDate, endDate, granularity],
    );

    return result.map((r: any) => ({
      period: r.period,
      avgLatency: parseFloat(r.avg_latency) || 0,
      p50Latency: parseFloat(r.p50_latency) || 0,
      p95Latency: parseFloat(r.p95_latency) || 0,
      sampleCount: parseInt(r.sample_count, 10) || 0,
    }));
  }

  /**
   * Get AI confidence trend over time.
   */
  async getAiConfidenceTrend(
    tenantId: string,
    startDate: Date,
    endDate: Date,
    granularity: "day" | "week" | "month" = "day",
  ) {
    const result = await this.repo.query(
      `
      SELECT 
        DATE_TRUNC($4, timestamp) as period,
        AVG((properties->>'confidence')::float) as avg_confidence,
        MIN((properties->>'confidence')::float) as min_confidence,
        MAX((properties->>'confidence')::float) as max_confidence,
        COUNT(*) as sample_count
      FROM events
      WHERE "tenantId" = $1
        AND "eventName" = 'ai.classification'
        AND timestamp BETWEEN $2 AND $3
        AND properties->>'confidence' IS NOT NULL
      GROUP BY DATE_TRUNC($4, timestamp)
      ORDER BY period ASC
      `,
      [tenantId, startDate, endDate, granularity],
    );

    return result.map((r: any) => ({
      period: r.period,
      avgConfidence: parseFloat(r.avg_confidence) || 0,
      minConfidence: parseFloat(r.min_confidence) || 0,
      maxConfidence: parseFloat(r.max_confidence) || 0,
      sampleCount: parseInt(r.sample_count, 10) || 0,
    }));
  }

  // ===========================================================================
  // AGENT PERFORMANCE TRENDS
  // ===========================================================================

  /**
   * Get agent resolved chats trend over time.
   */
  async getAgentResolvedTrend(
    tenantId: string,
    startDate: Date,
    endDate: Date,
    granularity: "day" | "week" | "month" = "day",
  ) {
    const result = await this.repo.query(
      `
      SELECT 
        DATE_TRUNC($4, timestamp) as period,
        COUNT(*) as resolved_count,
        COUNT(DISTINCT properties->>'agentId') as active_agents
      FROM events
      WHERE "tenantId" = $1
        AND "eventName" = 'chat.resolved'
        AND timestamp BETWEEN $2 AND $3
      GROUP BY DATE_TRUNC($4, timestamp)
      ORDER BY period ASC
      `,
      [tenantId, startDate, endDate, granularity],
    );

    return result.map((r: any) => ({
      period: r.period,
      resolvedCount: parseInt(r.resolved_count, 10) || 0,
      activeAgents: parseInt(r.active_agents, 10) || 0,
    }));
  }

  /**
   * Get agent resolution time trend over time.
   */
  async getAgentResolutionTimeTrend(
    tenantId: string,
    startDate: Date,
    endDate: Date,
    granularity: "day" | "week" | "month" = "day",
  ) {
    const result = await this.repo.query(
      `
      SELECT 
        DATE_TRUNC($4, timestamp) as period,
        AVG((properties->>'resolution_time_seconds')::float) as avg_resolution_time,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY (properties->>'resolution_time_seconds')::float) as p50_resolution_time,
        PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY (properties->>'resolution_time_seconds')::float) as p95_resolution_time,
        COUNT(*) as sample_count
      FROM events
      WHERE "tenantId" = $1
        AND "eventName" = 'chat.resolved'
        AND timestamp BETWEEN $2 AND $3
        AND properties->>'resolution_time_seconds' IS NOT NULL
      GROUP BY DATE_TRUNC($4, timestamp)
      ORDER BY period ASC
      `,
      [tenantId, startDate, endDate, granularity],
    );

    return result.map((r: any) => ({
      period: r.period,
      avgResolutionTime: parseFloat(r.avg_resolution_time) || 0,
      p50ResolutionTime: parseFloat(r.p50_resolution_time) || 0,
      p95ResolutionTime: parseFloat(r.p95_resolution_time) || 0,
      sampleCount: parseInt(r.sample_count, 10) || 0,
    }));
  }

  /**
   * Get top agents by performance in a period.
   */
  async getTopAgentsByResolutions(
    tenantId: string,
    startDate: Date,
    endDate: Date,
    limit: number = 10,
  ) {
    const result = await this.repo.query(
      `
      SELECT 
        properties->>'agentId' as agent_id,
        COUNT(*) as resolved_count,
        AVG((properties->>'resolution_time_seconds')::float) as avg_resolution_time
      FROM events
      WHERE "tenantId" = $1
        AND "eventName" = 'chat.resolved'
        AND timestamp BETWEEN $2 AND $3
        AND properties->>'agentId' IS NOT NULL
      GROUP BY properties->>'agentId'
      ORDER BY resolved_count DESC
      LIMIT $4
      `,
      [tenantId, startDate, endDate, limit],
    );

    return result.map((r: any) => ({
      agentId: r.agent_id,
      resolvedCount: parseInt(r.resolved_count, 10) || 0,
      avgResolutionTime: parseFloat(r.avg_resolution_time) || 0,
    }));
  }
}
