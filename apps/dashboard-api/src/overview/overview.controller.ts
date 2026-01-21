/**
 * =============================================================================
 * OVERVIEW CONTROLLER
 * =============================================================================
 * 
 * Handles HTTP requests for the dashboard overview endpoint.
 * This endpoint provides high-level KPIs for the analytics dashboard.
 * 
 * ROUTE: GET /api/dashboard/overview
 * 
 * HOW ROUTES ARE BUILT:
 * --------------------
 * The full URL is composed of:
 * 1. Global prefix: 'api/dashboard' (set in main.ts)
 * 2. Controller prefix: 'overview' (set in @Controller decorator)
 * 3. Method path: '' (empty, so just the controller path)
 * 
 * Result: /api/dashboard/overview
 */

import { Controller, Get, Query } from '@nestjs/common';
import { OverviewService } from './overview.service';

/**
 * @Controller('overview')
 * -----------------------
 * Defines this class as a controller with the route prefix 'overview'.
 * All methods in this controller will have URLs starting with /overview.
 */
@Controller('overview')
export class OverviewController {
  /**
   * Dependency Injection via constructor.
   * NestJS creates and injects the OverviewService automatically.
   */
  constructor(private readonly overviewService: OverviewService) {}

  /**
   * GET /api/dashboard/overview
   * ---------------------------
   * Returns overview statistics for the specified date range.
   * 
   * Example request:
   * GET /api/dashboard/overview?startDate=2024-01-01&endDate=2024-01-31
   * 
   * Example response:
   * {
   *   "status": "success",
   *   "data": {
   *     "totalSessions": 1500,
   *     "totalUsers": 1200,
   *     "conversionRate": 0.42,
   *     "avgSessionDuration": 245
   *   }
   * }
   * 
   * @param startDate - ISO date string for range start
   * @param endDate - ISO date string for range end  
   * @param tenantId - Tenant identifier (defaults to 'default-tenant')
   */
  @Get()
  async getOverview(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('tenantId') tenantId = 'default-tenant',
  ) {
    // Default to last 30 days if no dates provided
    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate 
      ? new Date(startDate) 
      : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

    return this.overviewService.getOverview(
      tenantId,
      start,
      end,
    );
  }

  /**
   * GET /api/dashboard/overview/page-paths
   * Returns top page paths for "Traffic by Journey" chart.
   */
  @Get('page-paths')
  async getTopPagePaths(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('tenantId') tenantId = 'default-tenant',
  ) {
    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate 
      ? new Date(startDate) 
      : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

    return this.overviewService.getTopPagePaths(
      tenantId,
      start,
      end,
    );
  }
}
