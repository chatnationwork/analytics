/**
 * =============================================================================
 * SESSIONS SERVICE
 * =============================================================================
 *
 * Business logic for session management and queries.
 * A "session" represents a single visit to the application.
 *
 * SESSION vs USER:
 * ---------------
 * - User: A person who uses your app (may have multiple devices)
 * - Session: A single visit from start to finish (ends after 30 min inactivity)
 *
 * One user can have many sessions across different days and devices.
 */

import { Injectable } from "@nestjs/common";
import { SessionRepository, EventRepository } from "@lib/database";

@Injectable()
export class SessionsService {
  constructor(
    private readonly sessionRepository: SessionRepository,
    private readonly eventRepository: EventRepository,
  ) {}

  /**
   * Get a paginated list of sessions within a date range.
   *
   * PAGINATION EXPLAINED:
   * --------------------
   * When you have lots of data, you don't want to load it all at once.
   * Pagination splits results into "pages":
   * - limit: How many items per page (e.g., 50)
   * - offset: How many items to skip (e.g., 0 for page 1, 50 for page 2)
   *
   * @param tenantId - Tenant ID for filtering
   * @param startDate - Start of date range
   * @param endDate - End of date range
   * @param limit - Maximum number of sessions to return
   * @param offset - Number of sessions to skip (for pagination)
   * @returns Object with sessions array and total count
   */
  async getSessions(
    tenantId: string,
    startDate: Date,
    endDate: Date,
    limit: number,
    offset: number,
  ) {
    return this.sessionRepository.findByDateRange(
      tenantId,
      startDate,
      endDate,
      limit,
      offset,
    );
  }

  /**
   * Search for users by userId, anonymousId, or partial match.
   *
   * @param tenantId - Tenant ID for filtering
   * @param query - Search query
   * @param limit - Max results to return
   * @returns Array of matching users with stats
   */
  async searchUsers(tenantId: string, query: string, limit: number) {
    const users = await this.sessionRepository.searchUsers(
      tenantId,
      query,
      limit,
    );
    return { users };
  }

  /**
   * Get the complete journey (events) for a user.
   *
   * @param tenantId - Tenant ID for filtering
   * @param id - The userId or anonymousId
   * @param type - Whether id is a userId or anonymousId
   * @param limit - Max events to return
   * @returns User info, sessions, and events
   */
  async getUserJourney(
    tenantId: string,
    id: string,
    type: "userId" | "anonymousId",
    limit: number,
  ) {
    // Get sessions for this user
    const sessions = await this.sessionRepository.findByUserOrAnonymousId(
      tenantId,
      id,
      type,
      50, // Max 50 sessions
    );

    // Get events for this user
    const events = await this.eventRepository.findByUserOrAnonymousId(
      tenantId,
      id,
      type,
      limit,
    );

    // Calculate stats
    const totalSessions = sessions.length;
    const totalEvents = events.length;
    const firstSeen =
      sessions.length > 0 ? sessions[sessions.length - 1].startedAt : null;
    const lastSeen = sessions.length > 0 ? sessions[0].startedAt : null;

    return {
      user: {
        id,
        type,
        totalSessions,
        totalEvents,
        firstSeen,
        lastSeen,
      },
      sessions,
      events,
    };
  }
}
