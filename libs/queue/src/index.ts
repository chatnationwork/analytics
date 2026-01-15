/**
 * =============================================================================
 * QUEUE LIBRARY - BARREL EXPORT
 * =============================================================================
 * 
 * This library provides Redis Streams integration for event queuing.
 * 
 * COMPONENTS:
 * ----------
 * - QueueModule: NestJS module with dynamic configuration
 * - EventProducer: For publishing events (Collector uses this)
 * - EventConsumer: For consuming events (Processor uses this)
 * - Constants: REDIS_CLIENT, EVENT_STREAM_KEY, CONSUMER_GROUP
 * 
 * USAGE:
 * -----
 * In Collector (producer only):
 *   imports: [QueueModule.forProducer()]
 * 
 * In Processor (consumer only):
 *   imports: [QueueModule.forConsumer()]
 */

// Module for DI setup
export * from './queue.module';

// Constants (injection tokens, stream keys)
export * from './constants';

// Producer for publishing events
export * from './producers/event.producer';

// Consumer for reading events
export * from './consumers/event.consumer';
