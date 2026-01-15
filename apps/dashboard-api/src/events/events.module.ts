/**
 * =============================================================================
 * EVENTS MODULE
 * =============================================================================
 * 
 * Feature module for event queries.
 * Bundles the events controller and service.
 */

import { Module } from '@nestjs/common';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';

import { DatabaseModule } from '@lib/database';

@Module({
  imports: [DatabaseModule.forFeature()],
  controllers: [EventsController],
  providers: [EventsService],
})
export class EventsModule {}
