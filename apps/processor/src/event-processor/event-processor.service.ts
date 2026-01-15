/**
 * =============================================================================
 * EVENT PROCESSOR SERVICE
 * =============================================================================
 * 
 * The heart of the Processor worker.
 * Consumes events from Redis, enriches them, and saves to database.
 * 
 * PROCESSING PIPELINE:
 * -------------------
 * 
 *   Redis Queue     →    Processor    →    PostgreSQL
 *       │                    │                 │
 *   Raw events        Enriched events    Queryable data
 *                           │
 *                    ┌──────┴──────┐
 *                    │             │
 *                 GeoIP         User-Agent
 *                 Lookup         Parsing
 * 
 * DEDUPLICATION:
 * -------------
 * Network issues can cause the same event to be sent multiple times.
 * We use the message_id field to detect and skip duplicates.
 * 
 * BATCH PROCESSING:
 * ----------------
 * We process events in batches (default: 10 at a time) for efficiency.
 * Batch database inserts are much faster than individual inserts.
 * 
 * OOP PRINCIPLES:
 * --------------
 * - Single Responsibility: Only handles event processing
 * - Dependency Injection: All dependencies injected via constructor
 * - Composition: Uses enricher services for specific tasks
 */

import { Injectable, Logger } from '@nestjs/common';
import { EventConsumer, StreamMessage, QueuedEvent } from '@lib/queue';
import { EventRepository, CreateEventDto } from '@lib/database';
import { GeoipEnricher } from '../enrichers/geoip.enricher';
import { UseragentEnricher } from '../enrichers/useragent.enricher';

@Injectable()
export class EventProcessorService {
  private readonly logger = new Logger(EventProcessorService.name);

  /**
   * Constructor with all dependencies injected.
   * 
   * @param eventConsumer - For consuming events from Redis queue
   * @param eventRepository - For saving events to PostgreSQL
   * @param geoipEnricher - For IP → location conversion
   * @param useragentEnricher - For User-Agent → device/browser info
   */
  constructor(
    private readonly eventConsumer: EventConsumer,
    private readonly eventRepository: EventRepository,
    private readonly geoipEnricher: GeoipEnricher,
    private readonly useragentEnricher: UseragentEnricher,
  ) {}

  /**
   * Start the processor worker.
   * 
   * This sets up the message handler and starts consuming from Redis.
   * The method returns immediately, but processing continues in background.
   */
  async start(): Promise<void> {
    // Set our handler function for incoming messages
    this.eventConsumer.setHandler(this.handleMessages.bind(this));
    
    // Start consuming from Redis (blocks until stop() is called)
    await this.eventConsumer.start(10, 5000);
  }

  /**
   * Stop the processor worker gracefully.
   * 
   * Finishes processing current batch before stopping.
   */
  async stop(): Promise<void> {
    await this.eventConsumer.stop();
  }

  /**
   * Handle a batch of messages from the queue.
   * 
   * This is the main processing function. For each batch:
   * 1. Check for duplicates (skip if already processed)
   * 2. Enrich events with additional data
   * 3. Save all events to database in one batch insert
   * 
   * @param messages - Array of messages from Redis
   */
  private async handleMessages(messages: StreamMessage[]): Promise<void> {
    const startTime = Date.now();

    const eventsToInsert: CreateEventDto[] = [];

    for (const { event } of messages) {
      // DEDUPLICATION: Check if we've already processed this event
      const exists = await this.eventRepository.messageIdExists(event.messageId);
      if (exists) {
        this.logger.debug(`Skipping duplicate: ${event.messageId}`);
        continue;
      }

      // ENRICHMENT: Add extra data to the event
      const enriched = this.enrichEvent(event);
      eventsToInsert.push(enriched);
    }

    // BATCH INSERT: Save all events at once (more efficient)
    if (eventsToInsert.length > 0) {
      await this.eventRepository.saveBatch(eventsToInsert);
    }

    // LOG: Processing stats
    const duration = Date.now() - startTime;
    this.logger.log(
      `Processed ${messages.length} messages, inserted ${eventsToInsert.length} events in ${duration}ms`,
    );
  }

  /**
   * Enrich a raw event with additional data.
   * 
   * Extracts context data and runs it through enrichers to add:
   * - Geographic data from IP address
   * - Device/browser data from User-Agent
   * - Page information from context
   * 
   * @param event - Raw event from the queue
   * @returns Enriched event ready for database insertion
   */
  private enrichEvent(event: QueuedEvent): CreateEventDto {
    // Extract nested context objects safely
    const context = event.context || {};
    const page = (context.page as any) || {};
    const userAgent = context.userAgent as string;

    // Run enrichers
    const geo = this.geoipEnricher.enrich(event.ipAddress);
    const device = this.useragentEnricher.enrich(userAgent);

    // Build the complete event object for database
    return {
      // IDs
      eventId: event.eventId,
      messageId: event.messageId,
      
      // Tenant/Project
      tenantId: event.tenantId,
      projectId: event.projectId,
      
      // Event info
      eventName: event.eventName,
      eventType: event.eventType,
      timestamp: new Date(event.timestamp),
      
      // Identity
      anonymousId: event.anonymousId,
      userId: event.userId,
      sessionId: event.sessionId,
      
      // Channel
      channelType: 'web',
      
      // Page context (extracted)
      pagePath: page.path,
      pageUrl: page.url,
      pageTitle: page.title,
      pageReferrer: page.referrer,
      
      // Device info (from User-Agent enricher)
      userAgent,
      deviceType: device.deviceType,
      osName: device.osName,
      osVersion: device.osVersion,
      browserName: device.browserName,
      browserVersion: device.browserVersion,
      
      // Geo info (from GeoIP enricher)
      ipAddress: event.ipAddress,
      countryCode: geo.countryCode,
      city: geo.city,
      
      // Custom properties
      properties: event.properties,
      
      // SDK version
      sdkVersion: ((context.library as any)?.version) || undefined,
    };
  }
}
