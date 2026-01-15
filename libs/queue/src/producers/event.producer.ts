/**
 * =============================================================================
 * EVENT PRODUCER
 * =============================================================================
 * 
 * Publishes analytics events to Redis Streams.
 * 
 * WHAT IS A PRODUCER?
 * ------------------
 * A producer sends messages to a queue. In this case:
 * - The Collector API receives events from the SDK
 * - It uses this EventProducer to put them in Redis
 * - The Processor worker reads them later
 * 
 * REDIS STREAMS COMMANDS:
 * ----------------------
 * XADD: Add a message to the stream
 *   XADD stream-key * field1 value1 field2 value2
 *   The * means "generate an ID for me"
 * 
 * XLEN: Get the length of the stream
 *   Useful for monitoring queue size
 * 
 * BATCH OPERATIONS:
 * ----------------
 * Redis pipeline allows sending multiple commands in one round trip.
 * Much faster than sending 100 individual XADD commands.
 */

import { Injectable, Inject, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT, EVENT_STREAM_KEY } from '../constants';

/**
 * Represents an event in the queue.
 * This is the shape of data between Collector and Processor.
 */
export interface QueuedEvent {
  eventId: string;
  messageId: string;
  tenantId: string;
  projectId: string;
  eventName: string;
  eventType: string;
  timestamp: string;
  anonymousId: string;
  userId?: string;
  sessionId: string;
  context: Record<string, unknown>;
  properties?: Record<string, unknown>;
  receivedAt: string;
  ipAddress?: string;
}

/**
 * Service for publishing events to Redis Streams.
 */
@Injectable()
export class EventProducer {
  private readonly logger = new Logger(EventProducer.name);

  /**
   * Constructor with Redis client injection.
   * 
   * @Inject(REDIS_CLIENT) tells NestJS to look up the REDIS_CLIENT
   * token in the DI container and inject it here.
   */
  constructor(
    @Inject(REDIS_CLIENT)
    private readonly redis: Redis,
  ) {}

  /**
   * Publish a single event to Redis Streams.
   * 
   * @param event - The event to publish
   * @returns The Redis-generated message ID
   * @throws Error if Redis fails
   * 
   * @example
   * const messageId = await producer.publish(event);
   * console.log(`Published with ID: ${messageId}`);
   */
  async publish(event: QueuedEvent): Promise<string> {
    try {
      const messageId = await this.redis.xadd(
        EVENT_STREAM_KEY,
        '*', // Let Redis generate the ID
        'data',
        JSON.stringify(event),
      );
      if (!messageId) {
        throw new Error('Redis xadd returned null');
      }
      return messageId;
    } catch (error: any) {
      this.logger.error(`Failed to publish event: ${error.message}`);
      throw error;
    }
  }

  /**
   * Publish multiple events in a single Redis operation.
   * 
   * PIPELINING:
   * ----------
   * Redis pipeline batches commands and sends them together.
   * Instead of: send XADD, wait, send XADD, wait, ... (100 times)
   * We do: send 100 XADDs, wait once, get all results
   * 
   * This is much faster for bulk operations.
   * 
   * @param events - Array of events to publish
   * @returns Array of message IDs
   * @throws Error if any command fails
   */
  async publishBatch(events: QueuedEvent[]): Promise<string[]> {
    // Create a pipeline (batch of commands)
    const pipeline = this.redis.pipeline();

    // Add XADD command for each event
    for (const event of events) {
      pipeline.xadd(EVENT_STREAM_KEY, '*', 'data', JSON.stringify(event));
    }

    // Execute all commands at once
    const results = await pipeline.exec();

    if (!results) {
      throw new Error('Pipeline execution failed');
    }

    // Process results - each is [error, value]
    return results.map((result) => {
      if (result[0]) {
        throw result[0]; // Rethrow any errors
      }
      return result[1] as string;
    });
  }

  /**
   * Get the current length of the event stream.
   * 
   * Useful for:
   * - Monitoring queue backlog
   * - Health checks
   * - Scaling decisions
   * 
   * @returns Number of messages in the stream
   */
  async getStreamLength(): Promise<number> {
    return this.redis.xlen(EVENT_STREAM_KEY);
  }
}
