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
  UseInterceptors,
  UploadedFile,
  Body,
  Delete,
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

  @Post("contacts/export")
  async exportContactsConfigured(
    @Request() req: any,
    @Body() body: { columns: string[]; filters?: { tags?: string[] } },
    @Res() res: FastifyReply,
  ) {
    if (!hasPermission((req as any).user, Permission.CONTACTS_VIEW)) {
      throw new ForbiddenException(
        "You need contacts.view permission to export contacts.",
      );
    }

    if (!body.columns || body.columns.length === 0) {
      throw new BadRequestException("At least one column must be selected");
    }

    const stream = await this.service.exportContactsConfigured(
      req.user.tenantId,
      body.columns,
      body.filters,
    );

    res.header("Content-Type", "text/csv");
    res.header(
      "Content-Disposition",
      `attachment; filename="contacts-${new Date().toISOString()}.csv"`,
    );

    return res.send(stream);
  }

  @Post("contacts/import")
  async importContacts(
    @Request() req: FastifyRequest,
    @Query("strategy") strategy?: "first" | "last" | "reject",
  ) {
    if (!hasPermission((req as any).user, Permission.CONTACTS_CREATE)) {
      throw new ForbiddenException("You need contacts.create permission to import contacts.");
    }
    const data = await (req as any).file();

    if (!data) {
      throw new BadRequestException("No file uploaded");
    }
    const buffer = await data.toBuffer();
    return this.service.importContacts(
      (req as any).user.tenantId,
      buffer,
      strategy || "last",
    );
  }

  @Post("contacts/import-mapped")
  async importContactsMapped(@Request() req: FastifyRequest) {
    if (!hasPermission((req as any).user, Permission.CONTACTS_CREATE)) {
      throw new ForbiddenException(
        "You need contacts.create permission to import contacts.",
      );
    }

    const parts = (req as any).parts();
    let buffer: Buffer | null = null;
    let mapping: Record<string, string> | null = null;
    let strategy: "first" | "last" | "reject" = "last";
    let additionalTags: string[] = [];

    for await (const part of parts) {
      if (part.file) {
        if (buffer) continue; // Only take first file
        buffer = await part.toBuffer();
      } else {
        if (part.fieldname === "mapping") {
          try {
            mapping = JSON.parse(part.value as string);
          } catch {
            throw new BadRequestException("Invalid mapping JSON");
          }
        }
        if (part.fieldname === "strategy") {
          strategy = part.value as "first" | "last" | "reject";
        }
        if (part.fieldname === "additionalTags") {
          try {
            const parsed = JSON.parse(part.value as string);
            additionalTags = Array.isArray(parsed)
              ? parsed.filter((t) => typeof t === "string")
              : [];
          } catch {
            // Ignore invalid JSON
          }
        }
      }
    }

    if (!buffer) {
      throw new BadRequestException("No file uploaded");
    }
    if (!mapping) {
      throw new BadRequestException("No column mapping provided");
    }

    return this.service.importContactsMapped(
      (req as any).user.tenantId,
      buffer,
      mapping,
      strategy,
      additionalTags,
    );
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
  @Get("mapping-templates")
  async getMappingTemplates(@Request() req: any) {
    return this.service.getMappingTemplates(req.user.tenantId);
  }

  @Post("mapping-templates")
  async createMappingTemplate(
    @Request() req: any,
    @Body() body: { name: string; mapping: Record<string, string> },
  ) {
    if (!hasPermission((req as any).user, Permission.CONTACTS_CREATE)) {
      throw new ForbiddenException(
        "You need contacts.create permission to save mapping templates.",
      );
    }
    if (!body.name || !body.mapping) {
      throw new BadRequestException("Name and mapping are required");
    }
    return this.service.createMappingTemplate(
      req.user.tenantId,
      body.name,
      body.mapping,
      req.user.id || "system", // Fallback if user ID missing from req.user
    );
  }

  @Delete("mapping-templates/:id")
  async deleteMappingTemplate(@Request() req: any, @Param("id") id: string) {
    if (!hasPermission((req as any).user, Permission.CONTACTS_CREATE)) {
      throw new ForbiddenException(
        "You need contacts.create permission to delete mapping templates.",
      );
    }
    return this.service.deleteMappingTemplate(req.user.tenantId, id);
  }
}
