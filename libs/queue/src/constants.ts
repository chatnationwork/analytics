/**
 * =============================================================================
 * QUEUE CONSTANTS
 * =============================================================================
 * 
 * Shared constants for the queue module.
 * Kept separate to avoid circular dependency issues.
 */

/**
 * Injection token for the Redis client.
 * Use: @Inject(REDIS_CLIENT) private redis: Redis
 */
export const REDIS_CLIENT = 'REDIS_CLIENT';

/**
 * Redis Stream key where events are stored.
 * All analytics events flow through this stream.
 */
export const EVENT_STREAM_KEY = 'analytics:events';

/**
 * Consumer group name for the Processor workers.
 * All processor instances join this group to share the workload.
 */
export const CONSUMER_GROUP = 'processors';
