import { Controller, Get, Query, Request, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { WhatsappAnalyticsService } from "./whatsapp-analytics.service";

@Controller("whatsapp-analytics")
@UseGuards(JwtAuthGuard)
export class WhatsappAnalyticsController {
  constructor(private readonly service: WhatsappAnalyticsService) {}

  @Get("stats")
  getStats(
    @Request() req: any,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
  ) {
    return this.service.getStats(
      req.user.tenantId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Get("volume")
  getVolume(
    @Request() req: any,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
  ) {
    return this.service.getVolumeByHour(
      req.user.tenantId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Get("heatmap")
  getHeatmap(
    @Request() req: any,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
  ) {
    return this.service.getHeatmap(
      req.user.tenantId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Get("agents")
  getAgents(
    @Request() req: any,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
  ) {
    return this.service.getAgentPerformance(
      req.user.tenantId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Get("countries")
  getCountries(
    @Request() req: any,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
  ) {
    return this.service.getCountryBreakdown(
      req.user.tenantId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Get("response-time")
  getResponseTime(
    @Request() req: any,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
  ) {
    return this.service.getResponseTime(
      req.user.tenantId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Get("funnel")
  getFunnel(
    @Request() req: any,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
  ) {
    return this.service.getFunnel(
      req.user.tenantId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Get("resolution-stats")
  getResolutionTimeStats(
    @Request() req: any,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
  ) {
    return this.service.getResolutionTimeStats(
      req.user.tenantId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Get("conversation-length")
  getConversationLength(
    @Request() req: any,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
  ) {
    return this.service.getConversationLength(
      req.user.tenantId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  // =============================================================================
  // TREND ENDPOINTS
  // =============================================================================

  @Get("trends/volume")
  getMessageVolumeTrend(
    @Request() req: any,
    @Query("granularity") granularity?: string,
    @Query("periods") periods?: string,
  ) {
    return this.service.getMessageVolumeTrend(
      req.user.tenantId,
      (granularity as "day" | "week" | "month") || "day",
      periods ? parseInt(periods, 10) : 30,
    );
  }

  @Get("trends/response-time")
  getResponseTimeTrend(
    @Request() req: any,
    @Query("granularity") granularity?: string,
    @Query("periods") periods?: string,
  ) {
    return this.service.getResponseTimeTrend(
      req.user.tenantId,
      (granularity as "day" | "week" | "month") || "day",
      periods ? parseInt(periods, 10) : 30,
    );
  }

  @Get("trends/read-rate")
  getReadRateTrend(
    @Request() req: any,
    @Query("granularity") granularity?: string,
    @Query("periods") periods?: string,
  ) {
    return this.service.getReadRateTrend(
      req.user.tenantId,
      (granularity as "day" | "week" | "month") || "day",
      periods ? parseInt(periods, 10) : 30,
    );
  }

  @Get("trends/new-contacts")
  getNewContactsTrend(
    @Request() req: any,
    @Query("granularity") granularity?: string,
    @Query("periods") periods?: string,
  ) {
    return this.service.getNewContactsTrend(
      req.user.tenantId,
      (granularity as "day" | "week" | "month") || "day",
      periods ? parseInt(periods, 10) : 30,
    );
  }

  @Get("contacts")
  getContacts(
    @Request() req: any,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    return this.service.getContacts(
      req.user.tenantId,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }
}
