/**
 * =============================================================================
 * EVENTS CONTROLLER
 * =============================================================================
 *
 * Handles HTTP requests for event data.
 * Used to show the timeline of events within a session and the live event stream.
 *
 * ROUTE: GET /api/dashboard/events?sessionId=xxx
 * ROUTE: GET /api/dashboard/events/recent?sinceMinutes=60&limit=200&eventName=...
 */

import { Controller, Get, Query, Request, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { EventsService } from "./events.service";

@Controller("events")
@UseGuards(JwtAuthGuard)
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  /**
   * GET /api/dashboard/events
   */
  @Get()
  async getEvents(@Query("sessionId") sessionId: string) {
    return this.eventsService.getEventsBySession(sessionId);
  }

  /**
   * GET /api/dashboard/events/recent
   * Live event stream (polling). Returns recent events for the current tenant.
   */
  @Get("recent")
  async getRecentEvents(
    @Request() req: { user: { tenantId: string } },
    @Query("sinceMinutes") sinceMinutes?: string,
    @Query("limit") limit?: string,
    @Query("eventName") eventName?: string,
  ) {
    return this.eventsService.getRecentEvents(
      req.user.tenantId,
      sinceMinutes ? parseInt(sinceMinutes, 10) : 60,
      limit ? parseInt(limit, 10) : 200,
      eventName || undefined,
    );
  }

  /**
   * GET /api/dashboard/events/distinct
   * Returns all unique event names for the funnel builder dropdown.
   */
  @Get("distinct")
  async getDistinctEvents(
    @Request() req: { user: { tenantId: string } },
    @Query("tenantId") tenantId?: string,
  ) {
    const tid = tenantId || req.user?.tenantId || "default-tenant";
    return this.eventsService.getDistinctEventNames(tid);
  }
}
