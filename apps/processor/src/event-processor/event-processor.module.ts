/**
 * =============================================================================
 * EVENT PROCESSOR MODULE
 * =============================================================================
 * 
 * The core processing module that ties everything together.
 * 
 * This module:
 * - Imports enrichers for data enhancement
 * - Provides the main processing service
 * - Exports the service so main.ts can start it
 */

import { Module } from '@nestjs/common';
import { EventProcessorService } from './event-processor.service';
import { EnrichersModule } from '../enrichers/enrichers.module';

import { DatabaseModule } from '@lib/database';

@Module({
  imports: [
    EnrichersModule,
    DatabaseModule.forFeature(),
  ], 
  providers: [EventProcessorService],
  exports: [EventProcessorService],
})
export class EventProcessorModule {}
