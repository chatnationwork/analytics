/**
 * =============================================================================
 * JOURNEYS ANALYTICS CONTROLLER
 * =============================================================================
 *
 * API endpoints for self-serve vs assisted journey analytics.
 */

import { Controller, Get, Query, Request, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { JourneysService } from "./journeys.service";

type Granularity = "day" | "week" | "month";

@Controller("journeys")
@UseGuards(JwtAuthGuard)
export class JourneysController {
  constructor(private readonly journeysService: JourneysService) {}

  /**
   * GET /journeys/overview
   * Get self-serve vs assisted journey overview stats.
   */
  @Get("overview")
  async getOverview(
    @Request() req: any,
    @Query("granularity") granularity?: string,
    @Query("periods") periods?: string,
  ) {
    const numPeriods = periods ? parseInt(periods, 10) : 30;
    return this.journeysService.getOverview(
      req.user.tenantId,
      (granularity as Granularity) || "day",
      numPeriods,
    );
  }

  /**
   * GET /journeys/trends/handoff
   * Get handoff rate trend over time.
   */
  @Get("trends/handoff")
  async getHandoffTrend(
    @Request() req: any,
    @Query("granularity") granularity?: string,
    @Query("periods") periods?: string,
  ) {
    const numPeriods = periods ? parseInt(periods, 10) : 30;
    return this.journeysService.getHandoffTrend(
      req.user.tenantId,
      (granularity as Granularity) || "day",
      numPeriods,
    );
  }

  /**
   * GET /journeys/handoff-by-step
   * Get handoffs grouped by journey step or reason.
   */
  @Get("handoff-by-step")
  async getHandoffByStep(
    @Request() req: any,
    @Query("granularity") granularity?: string,
    @Query("periods") periods?: string,
  ) {
    const numPeriods = periods ? parseInt(periods, 10) : 30;
    return this.journeysService.getHandoffByStep(
      req.user.tenantId,
      (granularity as Granularity) || "day",
      numPeriods,
    );
  }

  /**
   * GET /journeys/handoff-reasons
   * Get handoffs grouped by reason.
   */
  @Get("handoff-reasons")
  async getHandoffReasons(
    @Request() req: any,
    @Query("granularity") granularity?: string,
    @Query("periods") periods?: string,
  ) {
    const numPeriods = periods ? parseInt(periods, 10) : 30;
    return this.journeysService.getHandoffReasons(
      req.user.tenantId,
      (granularity as Granularity) || "day",
      numPeriods,
    );
  }

  /**
   * GET /journeys/time-to-handoff
   * Get time to handoff metrics.
   */
  @Get("time-to-handoff")
  async getTimeToHandoff(
    @Request() req: any,
    @Query("granularity") granularity?: string,
    @Query("periods") periods?: string,
  ) {
    const numPeriods = periods ? parseInt(periods, 10) : 30;
    return this.journeysService.getTimeToHandoff(
      req.user.tenantId,
      (granularity as Granularity) || "day",
      numPeriods,
    );
  }

  /**
   * GET /journeys/agent-performance
   * Get agent performance for assisted sessions.
   */
  @Get("agent-performance")
  async getAgentPerformance(
    @Request() req: any,
    @Query("granularity") granularity?: string,
    @Query("periods") periods?: string,
  ) {
    const numPeriods = periods ? parseInt(periods, 10) : 30;
    return this.journeysService.getAgentPerformance(
      req.user.tenantId,
      (granularity as Granularity) || "day",
      numPeriods,
    );
  }
}
