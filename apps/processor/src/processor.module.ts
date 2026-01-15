/**
 * =============================================================================
 * PROCESSOR ROOT MODULE
 * =============================================================================
 * 
 * Root module for the Processor worker.
 * 
 * MODULES IMPORTED:
 * ----------------
 * - ConfigModule: Environment configuration
 * - DatabaseModule: Database connection for writing events
 * - QueueModule: Redis connection for consuming events
 * - EnrichersModule: Services for data enrichment
 * - EventProcessorModule: The main processing logic
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { appConfig, databaseConfig, redisConfig } from '@lib/common';
import { DatabaseModule } from '@lib/database';
import { QueueModule } from '@lib/queue';
import { EventProcessorModule } from './event-processor/event-processor.module';
import { EnrichersModule } from './enrichers/enrichers.module';

@Module({
  imports: [
    // Load configuration from environment
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, redisConfig],
    }),

    // Database connection - we need this to INSERT events
    DatabaseModule.forRoot(),

    // Queue connection - we need this to CONSUME events from Redis
    QueueModule.forConsumer(),

    // Services for enriching events with extra data
    EnrichersModule,

    // Main event processing logic
    EventProcessorModule,
  ],
})
export class ProcessorModule {}
