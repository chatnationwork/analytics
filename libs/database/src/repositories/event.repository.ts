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

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { EventEntity } from '../entities/event.entity';

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
      order: { timestamp: 'ASC' },
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
      order: { timestamp: 'DESC' },
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
      .createQueryBuilder('event')
      .select('event.eventName', 'eventName')
      .addSelect('COUNT(DISTINCT event.sessionId)', 'count')
      .where('event.tenantId = :tenantId', { tenantId })
      .andWhere('event.eventName IN (:...eventNames)', { eventNames })
      .andWhere('event.timestamp BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .groupBy('event.eventName')
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
      .createQueryBuilder('event')
      .select('event.eventName', 'eventName')
      .addSelect('COUNT(*)', 'count')
      .where('event.tenantId = :tenantId', { tenantId })
      .groupBy('event.eventName')
      .orderBy('count', 'DESC')
      .getRawMany();

    return result.map((r) => r.eventName);
  }
}
