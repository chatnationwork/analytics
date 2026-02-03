/**
 * CSAT Analytics Controller
 * Serves CSAT metrics from csat_submitted events.
 */

import { Controller, Get, Query, Request, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CsatAnalyticsService } from "./csat-analytics.service";

type Granularity = "day" | "week" | "month";

@Controller("csat-analytics")
@UseGuards(JwtAuthGuard)
export class CsatAnalyticsController {
  constructor(private readonly csatAnalyticsService: CsatAnalyticsService) {}

  @Get("dashboard")
  async getDashboard(
    @Request() req: { user: { tenantId: string } },
    @Query("granularity") granularity: Granularity = "day",
    @Query("periods") periods: string = "30",
  ) {
    return this.csatAnalyticsService.getDashboard(
      req.user.tenantId,
      granularity,
      parseInt(periods, 10) || 30,
    );
  }
}
