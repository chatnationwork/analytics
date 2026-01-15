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

import { Injectable } from '@nestjs/common';
import { SessionRepository } from '@lib/database';

@Injectable()
export class SessionsService {
  constructor(private readonly sessionRepository: SessionRepository) {}

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
}
