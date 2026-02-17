/**
 * CampaignsController -- REST API for campaign management and analytics.
 */

import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  Req,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { CampaignsService } from "./campaigns.service";
import { CampaignOrchestratorService } from "./campaign-orchestrator.service";
import { CampaignAnalyticsService } from "./campaign-analytics.service";
import { AudienceService } from "./audience.service";
import { RateTrackerService } from "./rate-tracker.service";
import { CreateCampaignDto } from "./dto/create-campaign.dto";
import { UpdateCampaignDto } from "./dto/update-campaign.dto";
import { CampaignQueryDto } from "./dto/campaign-query.dto";
import { CampaignStatus } from "@lib/database";

@Controller("campaigns")
export class CampaignsController {
  constructor(
    private readonly campaignsService: CampaignsService,
    private readonly orchestrator: CampaignOrchestratorService,
    private readonly analytics: CampaignAnalyticsService,
    private readonly audienceService: AudienceService,
    private readonly rateTracker: RateTrackerService,
  ) {}

  /** List campaigns (paginated, filterable by status and sourceModule). */
  @Get()
  async list(@Req() req: any, @Query() query: CampaignQueryDto) {
    const tenantId = req.user?.tenantId;
    if (!tenantId) throw new Error("Tenant context required");
    return this.campaignsService.list(tenantId, query);
  }

  /** Cross-campaign analytics overview. */
  @Get("analytics/overview")
  async analyticsOverview(@Req() req: any) {
    const tenantId = req.user?.tenantId;
    if (!tenantId) throw new Error("Tenant context required");
    return this.analytics.getOverview(tenantId);
  }

  /** Get current 24h conversation quota status. */
  @Get("quota")
  async getQuota(@Req() req: any) {
    const tenantId = req.user?.tenantId;
    if (!tenantId) throw new Error("Tenant context required");
    return this.rateTracker.getQuotaStatus(tenantId);
  }

  /** Get a single campaign by ID. */
  @Get(":id")
  async findOne(
    @Req() req: any,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    const tenantId = req.user?.tenantId;
    if (!tenantId) throw new Error("Tenant context required");
    return this.campaignsService.findById(tenantId, id);
  }

  /** Get delivery metrics for a campaign. */
  @Get(":id/analytics")
  async campaignAnalytics(
    @Req() req: any,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    const tenantId = req.user?.tenantId;
    if (!tenantId) throw new Error("Tenant context required");
    return this.analytics.getCampaignMetrics(tenantId, id);
  }

  /** Get per-recipient delivery log (paginated). */
  @Get(":id/messages")
  async campaignMessages(
    @Req() req: any,
    @Param("id", ParseUUIDPipe) id: string,
    @Query("page") page?: number,
    @Query("limit") limit?: number,
  ) {
    const tenantId = req.user?.tenantId;
    if (!tenantId) throw new Error("Tenant context required");
    return this.analytics.getCampaignMessages(
      tenantId,
      id,
      page ?? 1,
      limit ?? 50,
    );
  }

  /** Get error breakdown for a failed/completed campaign. */
  @Get(":id/errors")
  async campaignErrors(
    @Req() req: any,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    const tenantId = req.user?.tenantId;
    if (!tenantId) throw new Error("Tenant context required");
    return this.analytics.getErrorBreakdown(tenantId, id);
  }

  /** Preview audience count with 24h window split and quota check. */
  @Post("audience/preview")
  @HttpCode(HttpStatus.OK)
  async previewAudience(@Req() req: any, @Body() body: { audienceFilter: any }) {
    const tenantId = req.user?.tenantId;
    if (!tenantId) throw new Error("Tenant context required");

    const split = await this.audienceService.countContactsWithWindowSplit(
      tenantId,
      body.audienceFilter ?? null,
    );

    const quotaCheck = await this.rateTracker.checkQuota(
      tenantId,
      split.outOfWindow,
    );

    return {
      ...split,
      quotaRemaining: quotaCheck.quotaStatus.remaining,
      tierLimit: quotaCheck.quotaStatus.tierLimit,
      businessSent24h: quotaCheck.quotaStatus.businessSent24h,
      canProceed: quotaCheck.canProceed,
      warning: quotaCheck.warning,
    };
  }

  /** Create a new campaign (draft). */
  @Post()
  async create(@Req() req: any, @Body() dto: CreateCampaignDto) {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.sub;
    if (!tenantId || !userId) throw new Error("Auth context required");
    return this.campaignsService.create(tenantId, userId, dto);
  }

  /** Update a draft campaign. */
  @Patch(":id")
  async update(
    @Req() req: any,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateCampaignDto,
  ) {
    const tenantId = req.user?.tenantId;
    if (!tenantId) throw new Error("Tenant context required");
    return this.campaignsService.update(tenantId, id, dto);
  }

  /** Trigger immediate send for a campaign. */
  @Post(":id/send")
  @HttpCode(HttpStatus.ACCEPTED)
  async send(
    @Req() req: any,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    const tenantId = req.user?.tenantId;
    if (!tenantId) throw new Error("Tenant context required");
    await this.orchestrator.execute(tenantId, id);
    return { message: "Campaign execution started" };
  }

  /** Schedule a campaign for later execution. */
  @Post(":id/schedule")
  @HttpCode(HttpStatus.OK)
  async schedule(
    @Req() req: any,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    const tenantId = req.user?.tenantId;
    if (!tenantId) throw new Error("Tenant context required");

    const campaign = await this.campaignsService.findById(tenantId, id);
    if (!campaign.scheduledAt) {
      throw new Error("Campaign must have a scheduledAt date to be scheduled");
    }

    await this.campaignsService.updateStatus(id, CampaignStatus.SCHEDULED);
    return { message: "Campaign scheduled", scheduledAt: campaign.scheduledAt };
  }

  /** Cancel a running or scheduled campaign. */
  @Post(":id/cancel")
  @HttpCode(HttpStatus.OK)
  async cancel(
    @Req() req: any,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    const tenantId = req.user?.tenantId;
    if (!tenantId) throw new Error("Tenant context required");
    return this.campaignsService.cancel(tenantId, id);
  }
}
