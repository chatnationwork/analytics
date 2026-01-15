/**
 * =============================================================================
 * EVENT CONSUMER
 * =============================================================================
 * 
 * Consumes analytics events from Redis Streams.
 * 
 * WHAT IS A CONSUMER?
 * ------------------
 * A consumer reads messages from a queue. In this case:
 * - The Processor worker uses this EventConsumer
 * - It reads events from Redis that were published by the Collector
 * - It processes them (enrich, save to database)
 * 
 * CONSUMER GROUPS:
 * ---------------
 * Redis consumer groups allow multiple workers to share a stream:
 * - Each message is delivered to only ONE consumer in the group
 * - If one consumer fails, another can take over
 * - Work is automatically load-balanced
 * 
 * REDIS STREAMS COMMANDS:
 * ----------------------
 * XGROUP CREATE: Create a consumer group
 * XREADGROUP: Read messages as part of a group
 * XACK: Acknowledge message processing is complete
 * 
 * MESSAGE LIFECYCLE:
 * -----------------
 * 1. XREADGROUP reads pending messages (delivered but not ACKed)
 * 2. Consumer processes the message
 * 3. XACK marks it as processed
 * 4. Redis removes it from pending list
 */

import { Injectable, Inject, Logger, OnModuleInit } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT, EVENT_STREAM_KEY, CONSUMER_GROUP } from '../constants';
import { QueuedEvent } from '../producers/event.producer';

/**
 * Represents a message from the stream.
 */
export interface StreamMessage {
  /** Redis-generated message ID */
  id: string;
  /** The deserialized event data */
  event: QueuedEvent;
}

/**
 * Handler function type for processing messages.
 */
export type EventHandler = (messages: StreamMessage[]) => Promise<void>;

/**
 * Service for consuming events from Redis Streams.
 * 
 * OnModuleInit: Interface that allows running code when the module initializes.
 * We use it to ensure the consumer group exists.
 */
@Injectable()
export class EventConsumer implements OnModuleInit {
  private readonly logger = new Logger(EventConsumer.name);
  
  /** Unique name for this consumer instance */
  private readonly consumerName: string;
  
  /** The handler function to call with received messages */
  private handler: EventHandler | null = null;
  
  /** Flag to control the consumption loop */
  private isRunning = false;

  constructor(
    @Inject(REDIS_CLIENT)
    private readonly redis: Redis,
  ) {
    // Generate unique consumer name using PID and timestamp
    this.consumerName = `consumer-${process.pid}-${Date.now()}`;
  }

  /**
   * Called when the module initializes.
   * Ensures the consumer group exists in Redis.
   */
  async onModuleInit() {
    await this.ensureConsumerGroup();
  }

  /**
   * Create the consumer group if it doesn't exist.
   * 
   * XGROUP CREATE:
   * - Creates a group for the stream
   * - MKSTREAM creates the stream if it doesn't exist
   * - '0' means start from the beginning of the stream
   */
  private async ensureConsumerGroup(): Promise<void> {
    try {
      await this.redis.xgroup(
        'CREATE',
        EVENT_STREAM_KEY,
        CONSUMER_GROUP,
        '0',
        'MKSTREAM',
      );
      this.logger.log(`Created consumer group: ${CONSUMER_GROUP}`);
    } catch (error: any) {
      // BUSYGROUP means the group already exists - that's fine
      if (error.message?.includes('BUSYGROUP')) {
        this.logger.debug(`Consumer group ${CONSUMER_GROUP} already exists`);
      } else {
        throw error;
      }
    }
  }

  /**
   * Set the message handler function.
   * Must be called before start().
   * 
   * @param handler - Function to call with received messages
   */
  setHandler(handler: EventHandler): void {
    this.handler = handler;
  }

  /**
   * Start consuming messages.
   * 
   * This method runs in a loop until stop() is called.
   * It blocks waiting for messages, then calls the handler.
   * 
   * @param batchSize - Max messages to read at once
   * @param blockMs - How long to wait for messages (milliseconds)
   */
  async start(batchSize = 10, blockMs = 5000): Promise<void> {
    if (!this.handler) {
      throw new Error('Handler not set. Call setHandler() first.');
    }

    this.isRunning = true;
    this.logger.log(`Starting consumer: ${this.consumerName}`);

    // Main consumption loop
    while (this.isRunning) {
      try {
        await this.consumeBatch(batchSize, blockMs);
      } catch (error: any) {
        this.logger.error(`Consumer error: ${error.message}`);
        // Wait before retrying to avoid spinning
        await this.sleep(1000);
      }
    }
  }

  /**
   * Stop consuming messages gracefully.
   */
  async stop(): Promise<void> {
    this.isRunning = false;
    this.logger.log(`Stopping consumer: ${this.consumerName}`);
  }

  /**
   * Read and process a batch of messages.
   * 
   * XREADGROUP:
   * - GROUP: Which consumer group
   * - Consumer name: Which consumer in the group
   * - COUNT: Max messages to read
   * - BLOCK: Wait up to N ms for messages
   * - STREAMS: Which stream(s) to read
   * - '>': Only new messages (not pending ones)
   */
  private async consumeBatch(batchSize: number, blockMs: number): Promise<void> {
    const results = await this.redis.xreadgroup(
      'GROUP',
      CONSUMER_GROUP,
      this.consumerName,
      'COUNT',
      batchSize,
      'BLOCK',
      blockMs,
      'STREAMS',
      EVENT_STREAM_KEY,
      '>',
    );

    // No messages received (timeout)
    if (!results || results.length === 0) {
      return;
    }

    // Extract messages from the result
    const [, messages] = results[0] as [string, [string, string[]][]];

    if (messages.length === 0) {
      return;
    }

    // Parse each message
    const parsed: StreamMessage[] = messages.map(([id, fields]) => {
      // fields = ['data', '{"..."}']
      const data = fields[1];
      return {
        id,
        event: JSON.parse(data) as QueuedEvent,
      };
    });

    // Call the handler with parsed messages
    await this.handler!(parsed);

    // Acknowledge that we've processed these messages
    // This removes them from the pending list
    const ids = parsed.map((m) => m.id);
    await this.redis.xack(EVENT_STREAM_KEY, CONSUMER_GROUP, ...ids);
  }

  /**
   * Helper to sleep for a number of milliseconds.
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
