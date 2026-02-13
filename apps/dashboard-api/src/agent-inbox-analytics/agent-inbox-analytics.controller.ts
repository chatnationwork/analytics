/**
 * =============================================================================
 * AGENT ANALYTICS CONTROLLER
 * =============================================================================
 *
 * API endpoints for agent analytics.
 * Provides resolution, transfer, agent performance, and team metrics.
 */

import { Controller, Get, Query, Request, UseGuards, Res } from "@nestjs/common";
import { FastifyReply } from "fastify";
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
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
  ) {
    return this.analyticsService.getDashboardStats(
      req.user.tenantId,
      granularity,
      parseInt(periods, 10) || 30,
      startDate,
      endDate,
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
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
  ) {
    return this.analyticsService.getResolutionOverview(
      req.user.tenantId,
      granularity,
      parseInt(periods, 10) || 30,
      startDate,
      endDate,
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
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
  ) {
    return this.analyticsService.getResolutionTrend(
      req.user.tenantId,
      granularity,
      parseInt(periods, 10) || 30,
      startDate,
      endDate,
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
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
  ) {
    return this.analyticsService.getResolutionByCategory(
      req.user.tenantId,
      granularity,
      parseInt(periods, 10) || 30,
      startDate,
      endDate,
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
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
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
      startDate,
      endDate,
    );
  }

  /**
   * Export resolution submissions as CSV.
   * Uses @Res() to bypass global ResponseInterceptor which wraps output in JSON.
   */
  @Get("resolutions/export")
  async exportResolutionSubmissions(
    @Request() req: { user: { tenantId: string } },
    @Res() res: FastifyReply,
    @Query("granularity") granularity: Granularity = "day",
    @Query("periods") periods: string = "30",
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
  ) {
    const csv = await this.analyticsService.exportResolutionSubmissions(
      req.user.tenantId,
      granularity,
      parseInt(periods, 10) || 30,
      startDate,
      endDate,
    );

    res.header("Content-Type", "text/csv");
    res.header("Content-Disposition", 'attachment; filename="resolutions.csv"');
    res.send(csv);
  }

  /**
   * Get transfer overview stats.
   */
  @Get("transfers")
  async getTransfers(
    @Request() req: { user: { tenantId: string } },
    @Query("granularity") granularity: Granularity = "day",
    @Query("periods") periods: string = "30",
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
  ) {
    return this.analyticsService.getTransferOverview(
      req.user.tenantId,
      granularity,
      parseInt(periods, 10) || 30,
      startDate,
      endDate,
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
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
  ) {
    return this.analyticsService.getTransferTrend(
      req.user.tenantId,
      granularity,
      parseInt(periods, 10) || 30,
      startDate,
      endDate,
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
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
  ) {
    return this.analyticsService.getTransferByReason(
      req.user.tenantId,
      granularity,
      parseInt(periods, 10) || 30,
      startDate,
      endDate,
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
   * Get re-engagement analytics: sent count, reply rate, time to reply, by agent.
   */
  @Get("reengagement")
  async getReengagement(
    @Request() req: { user: { tenantId: string } },
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
  ) {
    return this.analyticsService.getReengagementAnalytics(
      req.user.tenantId,
      startDate,
      endDate,
    );
  }

  /**
   * Get agent performance leaderboard.
   */
  @Get("leaderboard")
  async getLeaderboard(
    @Request() req: { user: { tenantId: string } },
    @Query("granularity") granularity: Granularity = "day",
    @Query("periods") periods: string = "30",
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
    @Query("limit") limit: string = "10",
  ) {
    return this.analyticsService.getAgentLeaderboard(
      req.user.tenantId,
      granularity,
      parseInt(periods, 10) || 30,
      parseInt(limit, 10) || 10,
      startDate,
      endDate,
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
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
  ) {
    return this.analyticsService.getAgentActivityTrend(
      req.user.tenantId,
      granularity,
      parseInt(periods, 10) || 30,
      startDate,
      endDate,
    );
  }

  @Get("agents/detailed")
  async getAgentDetails(
    @Request() req: { user: { tenantId: string } },
    @Query("granularity") granularity: Granularity = "day",
    @Query("periods") periods: string = "30",
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
  ) {
    return this.analyticsService.getAgentDetailedStats(
      req.user.tenantId,
      granularity,
      parseInt(periods, 10) || 30,
      startDate,
      endDate,
    );
  }

  @Get("agents/workload")
  async getAgentWorkload(
    @Request() req: { user: { tenantId: string } },
    @Query("granularity") granularity: Granularity = "day",
    @Query("periods") periods: string = "30",
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
  ) {
    return this.analyticsService.getAgentWorkloadDistribution(
      req.user.tenantId,
      granularity,
      parseInt(periods, 10) || 30,
      startDate,
      endDate,
    );
  }

  @Get("agents/summary")
  async getAgentSummary(
    @Request() req: { user: { tenantId: string } },
    @Query("granularity") granularity: Granularity = "day",
    @Query("periods") periods: string = "30",
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
  ) {
    return this.analyticsService.getAgentPerformanceSummary(
      req.user.tenantId,
      granularity,
      parseInt(periods, 10) || 30,
      startDate,
      endDate,
    );
  }

  /**
   * Get agent performance metrics: Assigned, Resolved, Unresolved, Expired,
   * avg 1st Response (minutes), avg Resolution time (minutes).
   * Chats still Active at end of day/shift count as Unresolved.
   */
  @Get("agents/performance-metrics")
  async getPerformanceMetrics(
    @Request() req: { user: { tenantId: string } },
    @Query("granularity") granularity: Granularity = "day",
    @Query("periods") periods: string = "30",
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
  ) {
    return this.analyticsService.getAgentPerformanceMetrics(
      req.user.tenantId,
      granularity,
      parseInt(periods, 10) || 30,
      startDate,
      endDate,
    );
  }
}
