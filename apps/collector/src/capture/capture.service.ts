/**
 * =============================================================================
 * CAPTURE SERVICE
 * =============================================================================
 *
 * Business logic for capturing analytics events.
 *
 * RESPONSIBILITY:
 * --------------
 * 1. Transform DTO events to queue format
 * 2. Add metadata (receivedAt timestamp, IP address)
 * 3. Publish events to Redis queue for async processing
 *
 * WHY ASYNC PROCESSING?
 * --------------------
 * We don't process events immediately because:
 * - Processing takes time (GeoIP lookup, User-Agent parsing, DB insert)
 * - We want to respond to clients quickly (low latency)
 * - We can batch database inserts for efficiency
 * - If the database is slow, we don't block event collection
 *
 * The Processor worker handles events from the queue asynchronously.
 */

import { Injectable, Logger } from "@nestjs/common";
import { Project } from "@lib/common";
import { EventProducer, QueuedEvent } from "@lib/queue";
import { CaptureBatchDto, CaptureEventDto } from "@lib/events";
import { MessageStorageService } from "./message-storage.service";

@Injectable()
export class CaptureService {
  private readonly logger = new Logger(CaptureService.name);

  /**
   * Constructor with dependency injection.
   *
   * @param eventProducer - Service for publishing events to Redis queue
   */
  constructor(
    private readonly eventProducer: EventProducer,
    private readonly messageStorage: MessageStorageService,
  ) {}

  /**
   * Process a batch of events from the SDK.
   *
   * Steps:
   * 1. Transform each event from DTO format to queue format
   * 2. Add metadata (project info, timestamp, IP)
   * 3. Publish all events to Redis queue in a batch
   * 4. Return immediately (processing happens async)
   *
   * @param dto - Validated batch from the SDK
   * @param project - Authenticated project from WriteKeyGuard
   * @param ipAddress - Client IP for geo-enrichment
   * @throws Error if publishing to queue fails
   */
  async processBatch(
    dto: CaptureBatchDto,
    project: Project,
    ipAddress?: string,
  ): Promise<void> {
    const receivedAt = new Date().toISOString();

    // Transform all events to queue format
    // 2. Transform events and store messages
    const queuedEvents: QueuedEvent[] = [];

    for (const event of dto.batch) {
      // Async storage of message (fire and forget to not block queueing)
      this.messageStorage
        .storeEvent(event, project)
        .catch((err) =>
          this.logger.error(`Error storing message: ${err.message}`),
        );

      queuedEvents.push(
        this.toQueuedEvent(event, project, receivedAt, ipAddress),
      );
    }

    try {
      // Publish all events to Redis queue in batch (atomic operation)
      await this.eventProducer.publishBatch(queuedEvents);
      this.logger.debug(`Published ${queuedEvents.length} events to queue`);
    } catch (error) {
      // Log error and re-throw so controller returns 500
      this.logger.error(`Failed to publish batch: ${error.message}`);
      throw error;
    }
  }

  /**
   * Merge optional journey_start/journey_end from the DTO into properties so they are stored in the events table (properties JSONB).
   * When omitted, we do not set them so existing queries are unchanged.
   */
  private mergeJourneyFlags(
    properties: Record<string, unknown> | undefined,
    event: CaptureEventDto,
  ): Record<string, unknown> {
    const base = properties ?? {};
    const out = { ...base };
    if (event.journey_start === true) out.journeyStart = true;
    if (event.journey_end === true) out.journeyEnd = true;
    return out;
  }

  /**
   * Transform a DTO event to the queue event format.
   *
   * DATA TRANSFORMATION PATTERN:
   * ---------------------------
   * The SDK uses snake_case (event_id, anonymous_id) because JavaScript
   * convention uses camelCase but we want JSON to be readable.
   *
   * Internally, we use camelCase (eventId, anonymousId) for TypeScript.
   *
   * This method handles the transformation and adds server-side metadata.
   *
   * @param event - Raw event from SDK (snake_case)
   * @param project - Project info to add to event
   * @param receivedAt - Server timestamp when we received the event
   * @param ipAddress - Client IP for enrichment
   * @returns Event ready for the queue (camelCase)
   */
  private toQueuedEvent(
    event: CaptureEventDto,
    project: Project,
    receivedAt: string,
    ipAddress?: string,
  ): QueuedEvent {
    return {
      // IDs
      eventId: event.event_id,
      messageId: event.message_id || event.event_id,

      // Project/Tenant for multi-tenant support
      tenantId: project.tenantId,
      projectId: project.projectId,

      // Event details
      eventName: event.event_name,
      eventType: event.event_type || "track",
      timestamp: event.timestamp,

      // Identity
      anonymousId: event.anonymous_id,
      userId: event.user_id,
      sessionId: event.session_id,

      // Context (browser info, page info, etc.)
      context: event.context as Record<string, unknown>,

      // Custom properties (include optional journey_start/journey_end so funnels and self-serve analytics can query them)
      properties: this.mergeJourneyFlags(event.properties, event),

      // Server-side metadata
      receivedAt,
      ipAddress,
    };
  }
}
