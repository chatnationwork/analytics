/**
 * =============================================================================
 * AGENT ANALYTICS CONTROLLER
 * =============================================================================
 *
 * API endpoints for agent analytics.
 * Provides resolution, transfer, agent performance, and team metrics.
 */

import { Controller, Get, Query, Request, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { AgentInboxAnalyticsService } from "./agent-inbox-analytics.service";

type Granularity = "day" | "week" | "month";

@Controller("agent-inbox-analytics")
@UseGuards(JwtAuthGuard)
export class AgentInboxAnalyticsController {
  constructor(private readonly analyticsService: AgentInboxAnalyticsService) {}

  /**
   * Get combined dashboard stats for quick overview.
   */
  @Get("dashboard")
  async getDashboard(
    @Request() req: { user: { tenantId: string } },
    @Query("granularity") granularity: Granularity = "day",
    @Query("periods") periods: string = "30",
  ) {
    return this.analyticsService.getDashboardStats(
      req.user.tenantId,
      granularity,
      parseInt(periods, 10) || 30,
    );
  }

  /**
   * Get resolution overview stats.
   */
  @Get("resolutions")
  async getResolutions(
    @Request() req: { user: { tenantId: string } },
    @Query("granularity") granularity: Granularity = "day",
    @Query("periods") periods: string = "30",
  ) {
    return this.analyticsService.getResolutionOverview(
      req.user.tenantId,
      granularity,
      parseInt(periods, 10) || 30,
    );
  }

  /**
   * Get resolution trend over time.
   */
  @Get("resolutions/trend")
  async getResolutionTrend(
    @Request() req: { user: { tenantId: string } },
    @Query("granularity") granularity: Granularity = "day",
    @Query("periods") periods: string = "30",
  ) {
    return this.analyticsService.getResolutionTrend(
      req.user.tenantId,
      granularity,
      parseInt(periods, 10) || 30,
    );
  }

  /**
   * Get resolution breakdown by category.
   */
  @Get("resolutions/by-category")
  async getResolutionByCategory(
    @Request() req: { user: { tenantId: string } },
    @Query("granularity") granularity: Granularity = "day",
    @Query("periods") periods: string = "30",
  ) {
    return this.analyticsService.getResolutionByCategory(
      req.user.tenantId,
      granularity,
      parseInt(periods, 10) || 30,
    );
  }

  /**
   * List individual wrap-up submissions (one per resolution).
   * Used by Wrap-up Reports Analytics to drill into each filled report and its chat.
   */
  @Get("resolutions/submissions")
  async getResolutionSubmissions(
    @Request() req: { user: { tenantId: string } },
    @Query("granularity") granularity: Granularity = "day",
    @Query("periods") periods: string = "30",
    @Query("page") page: string = "1",
    @Query("limit") limit: string = "20",
  ) {
    const p = Math.max(parseInt(page, 10) || 1, 1);
    const l = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 50);
    return this.analyticsService.getResolutionSubmissions(
      req.user.tenantId,
      granularity,
      parseInt(periods, 10) || 30,
      p,
      l,
    );
  }

  /**
   * Get transfer overview stats.
   */
  @Get("transfers")
  async getTransfers(
    @Request() req: { user: { tenantId: string } },
    @Query("granularity") granularity: Granularity = "day",
    @Query("periods") periods: string = "30",
  ) {
    return this.analyticsService.getTransferOverview(
      req.user.tenantId,
      granularity,
      parseInt(periods, 10) || 30,
    );
  }

  /**
   * Get transfer trend over time.
   */
  @Get("transfers/trend")
  async getTransferTrend(
    @Request() req: { user: { tenantId: string } },
    @Query("granularity") granularity: Granularity = "day",
    @Query("periods") periods: string = "30",
  ) {
    return this.analyticsService.getTransferTrend(
      req.user.tenantId,
      granularity,
      parseInt(periods, 10) || 30,
    );
  }

  /**
   * Get transfer breakdown by reason.
   */
  @Get("transfers/by-reason")
  async getTransferByReason(
    @Request() req: { user: { tenantId: string } },
    @Query("granularity") granularity: Granularity = "day",
    @Query("periods") periods: string = "30",
  ) {
    return this.analyticsService.getTransferByReason(
      req.user.tenantId,
      granularity,
      parseInt(periods, 10) || 30,
    );
  }

  /**
   * Get expired chat statistics.
   */
  @Get("expired-chats")
  async getExpiredChats(@Request() req: { user: { tenantId: string } }) {
    return this.analyticsService.getExpiredChatsOverview(req.user.tenantId);
  }

  /**
   * Get agent performance leaderboard.
   */
  @Get("leaderboard")
  async getLeaderboard(
    @Request() req: { user: { tenantId: string } },
    @Query("granularity") granularity: Granularity = "day",
    @Query("periods") periods: string = "30",
    @Query("limit") limit: string = "10",
  ) {
    return this.analyticsService.getAgentLeaderboard(
      req.user.tenantId,
      granularity,
      parseInt(periods, 10) || 30,
      parseInt(limit, 10) || 10,
    );
  }

  // ===========================================================================
  // AGENT PERFORMANCE ENDPOINTS
  // ===========================================================================

  /**
   * Get agent activity trend.
   */
  @Get("agents/activity")
  async getAgentActivity(
    @Request() req: { user: { tenantId: string } },
    @Query("granularity") granularity: Granularity = "day",
    @Query("periods") periods: string = "30",
  ) {
    return this.analyticsService.getAgentActivityTrend(
      req.user.tenantId,
      granularity,
      parseInt(periods, 10) || 30,
    );
  }

  /**
   * Get detailed stats for all agents.
   */
  @Get("agents/detailed")
  async getAgentDetails(
    @Request() req: { user: { tenantId: string } },
    @Query("granularity") granularity: Granularity = "day",
    @Query("periods") periods: string = "30",
  ) {
    return this.analyticsService.getAgentDetailedStats(
      req.user.tenantId,
      granularity,
      parseInt(periods, 10) || 30,
    );
  }

  /**
   * Get agent workload distribution.
   */
  @Get("agents/workload")
  async getAgentWorkload(
    @Request() req: { user: { tenantId: string } },
    @Query("granularity") granularity: Granularity = "day",
    @Query("periods") periods: string = "30",
  ) {
    return this.analyticsService.getAgentWorkloadDistribution(
      req.user.tenantId,
      granularity,
      parseInt(periods, 10) || 30,
    );
  }

  /**
   * Get agent performance summary.
   */
  @Get("agents/summary")
  async getAgentSummary(
    @Request() req: { user: { tenantId: string } },
    @Query("granularity") granularity: Granularity = "day",
    @Query("periods") periods: string = "30",
  ) {
    return this.analyticsService.getAgentPerformanceSummary(
      req.user.tenantId,
      granularity,
      parseInt(periods, 10) || 30,
    );
  }
}
