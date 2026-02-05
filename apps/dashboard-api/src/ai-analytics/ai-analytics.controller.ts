import { Controller, Get, Request, UseGuards, Query } from "@nestjs/common";
import { AiAnalyticsService } from "./ai-analytics.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";

type Granularity = "day" | "week" | "month";

@Controller("ai-analytics")
@UseGuards(JwtAuthGuard)
export class AiAnalyticsController {
  constructor(private readonly aiAnalyticsService: AiAnalyticsService) {}

  @Get("stats")
  async getStats(
    @Request() req: any,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
  ) {
    return this.aiAnalyticsService.getStats(
      req.user.tenantId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Get("intents")
  async getIntents(
    @Request() req: any,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
  ) {
    return this.aiAnalyticsService.getIntentBreakdown(
      req.user.tenantId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Get("latency")
  async getLatency(
    @Request() req: any,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
  ) {
    return this.aiAnalyticsService.getLatencyDistribution(
      req.user.tenantId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Get("errors")
  async getErrors(
    @Request() req: any,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
  ) {
    return this.aiAnalyticsService.getErrorBreakdown(
      req.user.tenantId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  // ===========================================================================
  // AI TRENDS
  // ===========================================================================

  /**
   * GET /ai-analytics/trends/classifications
   * Get AI classification volume trend over time.
   */
  @Get("trends/classifications")
  async getClassificationTrend(
    @Request() req: any,
    @Query("granularity") granularity?: string,
    @Query("periods") periods?: string,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
  ) {
    return this.aiAnalyticsService.getClassificationTrend(
      req.user.tenantId,
      (granularity as Granularity) || "day",
      periods ? parseInt(periods, 10) : 30,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  /**
   * GET /ai-analytics/trends/latency
   * Get AI latency trend over time.
   */
  @Get("trends/latency")
  async getLatencyTrend(
    @Request() req: any,
    @Query("granularity") granularity?: string,
    @Query("periods") periods?: string,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
  ) {
    return this.aiAnalyticsService.getLatencyTrend(
      req.user.tenantId,
      (granularity as Granularity) || "day",
      periods ? parseInt(periods, 10) : 30,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  /**
   * GET /ai-analytics/trends/confidence
   * Get AI confidence trend over time.
   */
  @Get("trends/confidence")
  async getConfidenceTrend(
    @Request() req: any,
    @Query("granularity") granularity?: string,
    @Query("periods") periods?: string,
  ) {
    return this.aiAnalyticsService.getConfidenceTrend(
      req.user.tenantId,
      (granularity as Granularity) || "day",
      periods ? parseInt(periods, 10) : 30,
    );
  }

  // ===========================================================================
  // AGENT PERFORMANCE TRENDS
  // ===========================================================================

  /**
   * GET /ai-analytics/trends/agent-resolved
   * Get agent resolved chats trend over time.
   */
  @Get("trends/agent-resolved")
  async getAgentResolvedTrend(
    @Request() req: any,
    @Query("granularity") granularity?: string,
    @Query("periods") periods?: string,
  ) {
    return this.aiAnalyticsService.getAgentResolvedTrend(
      req.user.tenantId,
      (granularity as Granularity) || "day",
      periods ? parseInt(periods, 10) : 30,
    );
  }

  /**
   * GET /ai-analytics/trends/resolution-time
   * Get agent resolution time trend over time.
   */
  @Get("trends/resolution-time")
  async getAgentResolutionTimeTrend(
    @Request() req: any,
    @Query("granularity") granularity?: string,
    @Query("periods") periods?: string,
  ) {
    return this.aiAnalyticsService.getAgentResolutionTimeTrend(
      req.user.tenantId,
      (granularity as Granularity) || "day",
      periods ? parseInt(periods, 10) : 30,
    );
  }

  /**
   * GET /ai-analytics/top-agents
   * Get top performing agents.
   */
  @Get("top-agents")
  async getTopAgents(
    @Request() req: any,
    @Query("granularity") granularity?: string,
    @Query("periods") periods?: string,
    @Query("limit") limit?: string,
  ) {
    return this.aiAnalyticsService.getTopAgents(
      req.user.tenantId,
      (granularity as Granularity) || "day",
      periods ? parseInt(periods, 10) : 30,
      limit ? parseInt(limit, 10) : 10,
    );
  }
}
