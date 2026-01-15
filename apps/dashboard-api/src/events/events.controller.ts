/**
 * =============================================================================
 * EVENTS CONTROLLER
 * =============================================================================
 * 
 * Handles HTTP requests for event data.
 * Used to show the timeline of events within a session.
 * 
 * ROUTE: GET /api/dashboard/events?sessionId=xxx
 */

import { Controller, Get, Query } from '@nestjs/common';
import { EventsService } from './events.service';

@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  /**
   * GET /api/dashboard/events
   */
  @Get()
  async getEvents(@Query('sessionId') sessionId: string) {
    return this.eventsService.getEventsBySession(sessionId);
  }

  /**
   * GET /api/dashboard/events/distinct
   * Returns all unique event names for the funnel builder dropdown.
   */
  @Get('distinct')
  async getDistinctEvents(@Query('tenantId') tenantId = 'default-tenant') {
    return this.eventsService.getDistinctEventNames(tenantId);
  }
}
