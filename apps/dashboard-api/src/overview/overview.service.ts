/**
 * =============================================================================
 * OVERVIEW SERVICE
 * =============================================================================
 * 
 * This service provides business logic for the dashboard overview page.
 * It calculates high-level KPIs (Key Performance Indicators) like:
 * - Total sessions
 * - Total unique users
 * - Conversion rate
 * - Average session duration
 * 
 * DESIGN PATTERN: Repository Pattern
 * -----------------------------------
 * This service uses the Repository Pattern - it doesn't interact with the
 * database directly. Instead, it calls the SessionRepository which handles
 * all database operations. This provides:
 * 
 * - Separation of concerns (business logic vs data access)
 * - Easier testing (we can mock the repository)
 * - Flexibility to change the database without changing business logic
 */

import { Injectable } from '@nestjs/common';
import { SessionRepository } from '@lib/database';

/**
 * @Injectable() - Marks this class as a provider that can be injected
 * into other classes. See FunnelService for detailed explanation.
 */
@Injectable()
export class OverviewService {
  /**
   * Constructor with dependency injection.
   * SessionRepository is automatically provided by NestJS.
   * 
   * @param sessionRepository - Repository for session-level queries
   */
  constructor(private readonly sessionRepository: SessionRepository) {}

  /**
   * Get overview statistics for the dashboard.
   * 
   * This method delegates to the repository which executes a SQL query
   * to calculate aggregate statistics in a single database call (efficient).
   * 
   * @param tenantId - The tenant ID for multi-tenant filtering
   * @param startDate - Start of the date range
   * @param endDate - End of the date range
   * @returns Object containing totalSessions, totalUsers, conversionRate, avgSessionDuration
   * 
   * @example
   * const stats = await overviewService.getOverview('tenant-1', startDate, endDate);
   * // Returns: { totalSessions: 1500, totalUsers: 1200, conversionRate: 0.42, avgSessionDuration: 245 }
   */
  async getOverview(tenantId: string, startDate: Date, endDate: Date) {
    return this.sessionRepository.getOverviewStats(tenantId, startDate, endDate);
  }
}
