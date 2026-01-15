/**
 * =============================================================================
 * SESSIONS CONTROLLER
 * =============================================================================
 * 
 * Handles HTTP requests for session data.
 * Used by the Session Explorer page in the dashboard.
 * 
 * ROUTE: GET /api/dashboard/sessions
 */

import { Controller, Get, Query } from '@nestjs/common';
import { SessionsService } from './sessions.service';

@Controller('sessions')
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  /**
   * GET /api/dashboard/sessions
   * ---------------------------
   * Returns a paginated list of sessions.
   * 
   * Query Parameters:
   * - startDate: Start of date range (required)
   * - endDate: End of date range (required)
   * - limit: Items per page (default: 50)
   * - offset: Items to skip (default: 0)
   * - tenantId: Tenant filter (default: 'default-tenant')
   * 
   * Example: /api/dashboard/sessions?startDate=2024-01-01&endDate=2024-01-31&limit=20&offset=0
   * 
   * TYPE COERCION:
   * -------------
   * Query parameters are always strings from the URL.
   * We use +limit and +offset to convert them to numbers (unary plus operator).
   * This is equivalent to: Number(limit), parseInt(limit, 10)
   */
  @Get()
  async getSessions(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('tenantId') tenantId = 'default-tenant',
    @Query('limit') limit = 50,
    @Query('offset') offset = 0,
  ) {
    return this.sessionsService.getSessions(
      tenantId,
      new Date(startDate),
      new Date(endDate),
      +limit,  // Convert to number
      +offset, // Convert to number
    );
  }
}
