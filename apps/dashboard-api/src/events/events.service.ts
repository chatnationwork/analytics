/**
 * =============================================================================
 * EVENTS SERVICE
 * =============================================================================
 * 
 * Business logic for event queries.
 * An "event" represents a single action a user took (page view, button click, etc.)
 * 
 * EVENT TYPES IN ANALYTICS:
 * ------------------------
 * - page_view: User navigated to a page
 * - button_click: User clicked a button
 * - form_submit: User submitted a form
 * - identify: User was identified (logged in)
 * - Custom events: Any event you define (return_filed, payment_initiated, etc.)
 */

import { Injectable } from '@nestjs/common';
import { EventRepository } from '@lib/database';

@Injectable()
export class EventsService {
  constructor(private readonly eventRepository: EventRepository) {}

  /**
   * Get all events for a specific session.
   */
  async getEventsBySession(sessionId: string) {
    const events = await this.eventRepository.findBySessionId(sessionId);
    return { events };
  }

  /**
   * Get distinct event names for the funnel builder.
   * Returns unique event names sorted by frequency (most common first).
   */
  async getDistinctEventNames(tenantId: string): Promise<string[]> {
    return this.eventRepository.getDistinctEventNames(tenantId);
  }
}
