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

import { Injectable, Logger } from "@nestjs/common";
import { EventConsumer, StreamMessage, QueuedEvent } from "@lib/queue";
import {
  TeamEntity,
  EventRepository,
  SessionRepository,
  CreateEventDto,
  SessionEntity,
  InboxSessionEntity,
  MessageEntity,
  ResolutionEntity,
  SessionStatus,
  MessageDirection,
  MessageType,
  InboxSessionHelper,
} from "@lib/database";
import { isMessageEvent, isInboundMessage, WhatsAppEventNames } from "@lib/events";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { GeoipEnricher } from "../enrichers/geoip.enricher";
import { UseragentEnricher } from "../enrichers/useragent.enricher";

@Injectable()
export class EventProcessorService {
  private readonly logger = new Logger(EventProcessorService.name);
  private readonly sessionHelper: InboxSessionHelper;

  constructor(
    private readonly eventConsumer: EventConsumer,
    private readonly eventRepository: EventRepository,
    private readonly sessionRepository: SessionRepository,
    private readonly geoipEnricher: GeoipEnricher,
    private readonly useragentEnricher: UseragentEnricher,
    @InjectRepository(InboxSessionEntity)
    private readonly inboxSessionRepo: Repository<InboxSessionEntity>,
    @InjectRepository(MessageEntity)
    private readonly messageRepo: Repository<MessageEntity>,
    @InjectRepository(ResolutionEntity)
    private readonly resolutionRepo: Repository<ResolutionEntity>,
    @InjectRepository(TeamEntity)
    private readonly teamRepo: Repository<TeamEntity>,
  ) {
    this.sessionHelper = new InboxSessionHelper(this.inboxSessionRepo, this.teamRepo);
  }

  async start(): Promise<void> {
    this.eventConsumer.setHandler(this.handleMessages.bind(this));
    await this.eventConsumer.start(10, 5000);
  }

  async stop(): Promise<void> {
    await this.eventConsumer.stop();
  }

  private async handleMessages(messages: StreamMessage[]): Promise<void> {
    const startTime = Date.now();

    const eventsToInsert: CreateEventDto[] = [];

    for (const { event } of messages) {
      if (await this.eventRepository.messageIdExists(event.messageId)) {
        continue;
      }

      const enriched = this.enrichEvent(event);
      eventsToInsert.push(enriched);
    }

    if (eventsToInsert.length > 0) {
      // Save events
      await this.eventRepository.saveBatch(eventsToInsert);

      // Update sessions
      await this.processSessions(eventsToInsert);

      // Sync to Agent System (Inbox)
      await this.syncToAgentSystem(eventsToInsert);

      // Update resolution CSAT when csat_submitted events are received (user_id can be phone number)
      await this.processCsatEvents(eventsToInsert);
    }

    const duration = Date.now() - startTime;
    this.logger.log(
      `Processed ${messages.length} messages, inserted ${eventsToInsert.length} events in ${duration}ms`,
    );
  }

  private async processSessions(events: CreateEventDto[]): Promise<void> {
    // Group events by session ID to minimize DB calls
    const sessionsMap = new Map<string, CreateEventDto[]>();

    for (const event of events) {
      if (event.sessionId) {
        if (!sessionsMap.has(event.sessionId)) {
          sessionsMap.set(event.sessionId, []);
        }
        sessionsMap.get(event.sessionId)!.push(event);
      }
    }

    // Process each session
    for (const [sessionId, sessionEvents] of sessionsMap.entries()) {
      try {
        await this.updateSession(sessionId, sessionEvents);
      } catch (err) {
        this.logger.error(
          `Failed to update session ${sessionId}: ${err.message}`,
        );
      }
    }
  }

  private async updateSession(
    sessionId: string,
    events: CreateEventDto[],
  ): Promise<void> {
    // Fetch existing session or create new
    let session = await this.sessionRepository.findById(sessionId);
    const sortedEvents = events.sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime(),
    );
    const firstEvent = sortedEvents[0];
    const lastEvent = sortedEvents[sortedEvents.length - 1];

    if (!session) {
      // Create new session
      session = new SessionEntity();
      session.sessionId = sessionId;
      session.tenantId = firstEvent.tenantId;
      session.anonymousId = firstEvent.anonymousId;
      session.userId = firstEvent.userId || null;
      session.startedAt = firstEvent.timestamp;
      session.endedAt = lastEvent.timestamp;
      session.eventCount = 0;
      session.pageCount = 0;
      session.durationSeconds = 0;

      // Attribution (First Touch)
      session.entryPage = firstEvent.pagePath || null;
      session.referrer = firstEvent.pageReferrer || null;

      // Device / Geo (from first event)
      session.deviceType = firstEvent.deviceType || null;
      session.countryCode = firstEvent.countryCode || null;

      // UTM params (if present in first event properties)
      const props = firstEvent.properties || {};
      session.utmSource = (props.utm_source as string) || null;
      session.utmMedium = (props.utm_medium as string) || null;
      session.utmCampaign = (props.utm_campaign as string) || null;
    } else {
      // Update existing
      if (firstEvent.timestamp < session.startedAt) {
        session.startedAt = firstEvent.timestamp;
      }
      if (lastEvent.timestamp > (session.endedAt || session.startedAt)) {
        session.endedAt = lastEvent.timestamp;
      }

      // Update userId if identified later in session
      if (!session.userId && firstEvent.userId) {
        session.userId = firstEvent.userId;
      }
    }

    // Update stats
    session.eventCount += events.length;
    session.pageCount += events.filter(
      (e) => e.eventType === "page" || e.eventName === "page_view",
    ).length;

    // Recalculate duration
    if (session.endedAt) {
      session.durationSeconds = Math.round(
        (session.endedAt.getTime() - session.startedAt.getTime()) / 1000,
      );
    }

    // Check for conversion
    if (!session.converted) {
      const conversion = events.find(
        (e) =>
          e.eventName === "conversion" ||
          e.eventName === "purchase" ||
          e.eventName === "form_submit",
      ); // Example conversion events
      if (conversion) {
        session.converted = true;
        session.conversionEvent = conversion.eventName;
      }
    }

    await this.sessionRepository.save(session);
  }

  /**
   * Syncs relevant events (messages) to the Agent System (Inbox).
   * This ensures the Agent UI sees messages in real-time.
   */
  private async syncToAgentSystem(events: CreateEventDto[]): Promise<void> {
    for (const event of events) {
      if (isMessageEvent(event.eventName)) {
        try {
          await this.processInboxMessage(event);
        } catch (err) {
          this.logger.error(
            `Failed to sync message for event ${event.eventId}: ${err.message}`,
          );
        }
      }
    }
  }

  private async processInboxMessage(event: CreateEventDto): Promise<void> {
    const props = event.properties || {};
    const contactId = event.externalId;

    if (!contactId || typeof contactId !== "string") {
      this.logger.warn(
        `Skipping inbox sync for event ${event.eventId}: No externalId (contact phone) found.`,
      );
      return;
    }

    let session: InboxSessionEntity;
    try {
      session = await this.sessionHelper.getOrCreateSession(
        event.tenantId,
        contactId,
        {
          contactName: props.name as string,
          channel: "whatsapp",
          context: { source: "webhook_sync" },
        },
      );
    } catch (err) {
      this.logger.warn(
        `Skipping inbox sync for event ${event.eventId}: ${(err as Error).message}`,
      );
      return;
    }

    await this.inboxSessionRepo.update(session.id, {
      lastMessageAt: event.timestamp,
    });

    const isInbound = isInboundMessage(event.eventName);
    const direction = isInbound
      ? MessageDirection.INBOUND
      : MessageDirection.OUTBOUND;

    let content = "";
    let messageType = MessageType.TEXT;

    if (props.text) {
      if (typeof props.text === "object") {
        const body = (props.text as any).body;
        // If body is explicitly null (common upstream bug), treat as empty string rather than stringifying JSON
        if (body === null) {
          content = "";
        } else {
          content = body || JSON.stringify(props.text);
        }
      } else if (typeof props.text === "string") {
        if (props.text.trim().startsWith("{")) {
          try {
            const parsed = JSON.parse(props.text);
            content = parsed.body || props.text;
          } catch {
            content = props.text;
          }
        } else {
          content = props.text;
        }
      }
    } else if (props.type === "template") {
      messageType = MessageType.TEXT;
      content = `Template: ${(props.template as any)?.name}`;
    } else if (
      props.type === "image" ||
      props.type === "video" ||
      props.type === "document" ||
      props.type === "audio"
    ) {
      messageType = props.type as MessageType;
      content = `[${props.type.toUpperCase()}]`;
    }

    const message = this.messageRepo.create({
      contactId: session.contactId,
      sessionId: session.id,
      tenantId: event.tenantId,
      externalId: (props.message_id as string) || event.messageId,
      direction,
      type: messageType,
      content,
      senderId: isInbound ? undefined : event.userId || undefined,
      metadata: props,
      createdAt: event.timestamp,
    });


    await this.messageRepo.save(message);
    this.logger.log(`Synced message to Inbox: ${message.id} (${direction})`);
  }

  /**
   * When we receive csat_submitted events, update the resolution row for that session
   * so CSAT analytics and agent reports can use csatScore/csatFeedback.
   * Expects properties.rating (number) and optionally properties.feedback (string).
   */
  private async processCsatEvents(events: CreateEventDto[]): Promise<void> {
    for (const event of events) {
      if (event.eventName !== "csat_submitted" || !event.sessionId) continue;

      const props = event.properties ?? {};
      const rating =
        typeof props.rating === "number"
          ? props.rating
          : typeof props.rating === "string"
            ? parseInt(props.rating, 10)
            : undefined;
      const feedback =
        typeof props.feedback === "string" ? props.feedback : undefined;

      if (rating == null && feedback == null) continue;

      try {
        const resolution = await this.resolutionRepo.findOne({
          where: { sessionId: event.sessionId },
        });
        if (!resolution) continue;

        if (rating != null) resolution.csatScore = rating;
        if (feedback !== undefined) resolution.csatFeedback = feedback;
        await this.resolutionRepo.save(resolution);
        this.logger.debug(
          `Updated CSAT for session ${event.sessionId}: score=${rating}, feedback=${feedback != null ? "yes" : "no"}`,
        );
      } catch (err) {
        this.logger.warn(
          `Failed to update resolution CSAT for session ${event.sessionId}: ${(err as Error).message}`,
        );
      }
    }
  }

  private enrichEvent(event: QueuedEvent): CreateEventDto {
    // Extract nested context objects safely
    const context = event.context || {};
    const page = (context.page as any) || {};
    const userAgent = context.userAgent as string;

    // Determine channel type from context (default to 'web' for backwards compatibility)
    const channelType = (context.channel as string) || "web";
    const isWebChannel = channelType === "web";

    // Auto-fill externalId for WhatsApp if missing
    let externalId = (context as any).externalId;

    if (!externalId && channelType === "whatsapp") {
      const props = event.properties || {};
      if (isInboundMessage(event.eventName)) {
        externalId = props.from;
      } else if (event.eventName === WhatsAppEventNames.MESSAGE_SENT) {
        externalId = props.to;
      }
    }


    // Run enrichers only for web channel (UA/GeoIP not applicable for WhatsApp)
    const geo = isWebChannel
      ? this.geoipEnricher.enrich(event.ipAddress)
      : { countryCode: undefined, city: undefined };
    const device = isWebChannel
      ? this.useragentEnricher.enrich(userAgent)
      : {
          deviceType: undefined,
          osName: undefined,
          osVersion: undefined,
          browserName: undefined,
          browserVersion: undefined,
        };

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

      // Channel (from context or default to 'web')
      channelType,
      externalId,

      // Page context (only relevant for web)
      pagePath: isWebChannel ? page.path : undefined,
      pageUrl: isWebChannel ? page.url : undefined,
      pageTitle: isWebChannel ? page.title : undefined,
      pageReferrer: isWebChannel ? page.referrer : undefined,

      // Device info (from User-Agent enricher - web only)
      userAgent: isWebChannel ? userAgent : undefined,
      deviceType: device.deviceType,
      osName: device.osName,
      osVersion: device.osVersion,
      browserName: device.browserName,
      browserVersion: device.browserVersion,

      // Geo info (from GeoIP enricher - web only)
      ipAddress: isWebChannel ? event.ipAddress : undefined,
      countryCode: geo.countryCode,
      city: geo.city,

      // Custom properties (WhatsApp events store their data here)
      properties: event.properties,

      // SDK version
      sdkVersion: (context.library as any)?.version || undefined,
    };
  }
}
