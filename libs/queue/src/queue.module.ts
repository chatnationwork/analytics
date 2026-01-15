/**
 * =============================================================================
 * QUEUE MODULE
 * =============================================================================
 * 
 * Provides Redis Streams integration for event queuing.
 * 
 * REDIS STREAMS:
 * -------------
 * Redis Streams is a log data structure that we use as a message queue.
 * It's like Kafka but simpler, built into Redis.
 * 
 * Key concepts:
 * - Stream: An append-only log (like a list you can only add to)
 * - Consumer Group: A set of consumers that share the workload
 * - Consumer: An individual worker that reads messages
 * - XADD: Add a message to the stream
 * - XREADGROUP: Read messages as part of a consumer group
 * - XACK: Acknowledge that you've processed a message
 * 
 * DYNAMIC MODULE METHODS:
 * ----------------------
 * - forProducer(): Use in Collector (only publishes events)
 * - forConsumer(): Use in Processor (only consumes events)
 * - forRoot(): Use when you need both (testing, etc.)
 */

import { Module, DynamicModule, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { REDIS_CLIENT, EVENT_STREAM_KEY, CONSUMER_GROUP } from './constants';
import { EventProducer } from './producers/event.producer';
import { EventConsumer } from './consumers/event.consumer';

// Re-export constants for convenience
export { REDIS_CLIENT, EVENT_STREAM_KEY, CONSUMER_GROUP } from './constants';

/**
 * @Global() decorator makes this module's exports available
 * everywhere without re-importing. Use sparingly!
 */
@Global()
@Module({})
export class QueueModule {
  /**
   * Create Redis provider factory.
   * Reusable across all dynamic module methods.
   */
  private static createRedisProvider() {
    return {
      provide: REDIS_CLIENT,
      useFactory: (configService: ConfigService): Redis => {
        const host = configService.get<string>('redis.host', 'localhost');
        const port = configService.get<number>('redis.port', 6379);
        
        return new Redis({
          host,
          port,
          maxRetriesPerRequest: 3,
          retryStrategy: (times) => {
            // Exponential backoff with max 3 second delay
            const delay = Math.min(times * 100, 3000);
            return delay;
          },
        });
      },
      inject: [ConfigService],
    };
  }

  /**
   * Full module with both producer and consumer.
   * Use for testing or when you need both.
   */
  static forRoot(): DynamicModule {
    return {
      module: QueueModule,
      imports: [ConfigModule],
      providers: [
        this.createRedisProvider(),
        EventProducer,
        EventConsumer,
      ],
      exports: [REDIS_CLIENT, EventProducer, EventConsumer],
    };
  }

  /**
   * Producer-only module for the Collector API.
   * Only includes EventProducer to minimize memory usage.
   */
  static forProducer(): DynamicModule {
    return {
      module: QueueModule,
      imports: [ConfigModule],
      providers: [
        this.createRedisProvider(),
        EventProducer,
      ],
      exports: [REDIS_CLIENT, EventProducer],
    };
  }

  /**
   * Consumer-only module for the Processor worker.
   * Only includes EventConsumer to minimize memory usage.
   */
  static forConsumer(): DynamicModule {
    return {
      module: QueueModule,
      imports: [ConfigModule],
      providers: [
        this.createRedisProvider(),
        EventConsumer,
      ],
      exports: [REDIS_CLIENT, EventConsumer],
    };
  }
}
