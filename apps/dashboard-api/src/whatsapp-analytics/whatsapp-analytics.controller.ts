import {
  Controller,
  Get,
  Post,
  Patch,
  Query,
  Request,
  Res,
  UseGuards,
  BadRequestException,
  ForbiddenException,
  Param,
} from "@nestjs/common";
import { FastifyReply, FastifyRequest } from "fastify";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { Permission } from "@lib/database";
import { WhatsappAnalyticsService } from "./whatsapp-analytics.service";

function hasPermission(user: { permissions?: { global?: string[] } }, permission: Permission): boolean {
  return user.permissions?.global?.includes(permission) === true;
}

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
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
  ) {
    return this.service.getMessageVolumeTrend(
      req.user.tenantId,
      (granularity as "day" | "week" | "month") || "day",
      periods ? parseInt(periods, 10) : 30,
      startDate,
      endDate,
    );
  }

  @Get("trends/response-time")
  getResponseTimeTrend(
    @Request() req: any,
    @Query("granularity") granularity?: string,
    @Query("periods") periods?: string,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
  ) {
    return this.service.getResponseTimeTrend(
      req.user.tenantId,
      (granularity as "day" | "week" | "month") || "day",
      periods ? parseInt(periods, 10) : 30,
      startDate,
      endDate,
    );
  }

  @Get("trends/read-rate")
  getReadRateTrend(
    @Request() req: any,
    @Query("granularity") granularity?: string,
    @Query("periods") periods?: string,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
  ) {
    return this.service.getReadRateTrend(
      req.user.tenantId,
      (granularity as "day" | "week" | "month") || "day",
      periods ? parseInt(periods, 10) : 30,
      startDate,
      endDate,
    );
  }

  @Get("trends/new-contacts")
  getNewContactsTrend(
    @Request() req: any,
    @Query("granularity") granularity?: string,
    @Query("periods") periods?: string,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
  ) {
    return this.service.getNewContactsTrend(
      req.user.tenantId,
      (granularity as "day" | "week" | "month") || "day",
      periods ? parseInt(periods, 10) : 30,
      startDate,
      endDate,
    );
  }

  @Get("contacts")
  getContacts(
    @Request() req: any,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    if (!hasPermission(req.user, Permission.CONTACTS_VIEW)) {
      throw new ForbiddenException("You need contacts.view permission to list contacts.");
    }
    return this.service.getContacts(
      req.user.tenantId,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  @Get("contacts/export")
  async exportContacts(@Request() req: any, @Res() res: FastifyReply) {
    if (!hasPermission(req.user, Permission.CONTACTS_VIEW)) {
      throw new ForbiddenException("You need contacts.view permission to export contacts.");
    }
    const csvStream = await this.service.exportContacts(req.user.tenantId);

    res.header("Content-Type", "text/csv");
    res.header("Content-Disposition", 'attachment; filename="contacts.csv"');

    return res.send(csvStream);
  }

  @Post("contacts/import")
  async importContacts(@Request() req: FastifyRequest) {
    if (!hasPermission((req as any).user, Permission.CONTACTS_CREATE)) {
      throw new ForbiddenException("You need contacts.create permission to import contacts.");
    }
    const data = await (req as any).file();

    if (!data) {
      throw new BadRequestException("No file uploaded");
    }
    const buffer = await data.toBuffer();
    return this.service.importContacts((req as any).user.tenantId, buffer);
  }

  @Patch("contacts/:contactId/deactivate")
  async deactivateContact(@Request() req: any, @Param("contactId") contactId: string) {
    if (!hasPermission(req.user, Permission.CONTACTS_DEACTIVATE)) {
      throw new ForbiddenException("You need contacts.deactivate permission to deactivate a contact.");
    }
    if (!contactId?.trim()) {
      throw new BadRequestException("contactId is required");
    }
    return this.service.deactivateContact(req.user.tenantId, contactId.trim());
  }
}
