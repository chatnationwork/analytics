import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Request,
  UseGuards,
  Req,
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { EosEventService } from "./eos-event.service";
import { CreateEventDto } from "./dto/create-event.dto";
import { SendEventInviteDto } from "./dto/send-event-invite.dto";
import { EosAnalyticsService } from "./eos-analytics.service";

@Controller("eos/events")
@UseGuards(JwtAuthGuard)
export class EosEventController {
  constructor(
    private readonly eventService: EosEventService,
    private readonly analyticsService: EosAnalyticsService,
  ) {}

  @Post()
  create(@Req() req: any, @Body() dto: CreateEventDto) {
    return this.eventService.createEvent(req.user, dto);
  }

  @Get(":id")
  findOne(@Req() req: any, @Param("id") id: string) {
    return this.eventService.findOne(req.user.tenantId, id);
  }

  @Patch(":id")
  update(@Req() req: any, @Param("id") id: string, @Body() updates: any) {
    return this.eventService.update(req.user, id, updates);
  }

  @Post(":id/publish")
  publish(@Req() req: any, @Param("id") id: string) {
    return this.eventService.publishEvent(req.user.tenantId, id);
  }

  @Get()
  findAll(@Req() req: any) {
    return this.eventService.findAll(req.user.tenantId);
  }

  @Get(":id/venue-layout")
  getVenueLayout(@Req() req: any, @Param("id") id: string) {
    return this.eventService.getVenueLayout(req.user.tenantId, id);
  }

  @Patch(":id/venue-layout")
  updateVenueLayout(
    @Req() req: any,
    @Param("id") id: string,
    @Body() layout: any,
  ) {
    return this.eventService.updateVenueLayout(req.user.tenantId, id, layout);
  }

  @Get(":id/metrics")
  getMetrics(@Req() req: any, @Param("id") id: string) {
    return this.eventService.getEventMetrics(req.user.tenantId, id);
  }

  @Post(":id/cancel")
  cancel(@Req() req: any, @Param("id") id: string) {
    return this.eventService.cancelEvent(req.user.tenantId, id);
  }

  @Post(":id/complete")
  complete(@Req() req: any, @Param("id") id: string) {
    return this.eventService.endEvent(req.user.tenantId, id);
  }

  @Post(":id/broadcast")
  broadcast(
    @Req() req: any,
    @Param("id") id: string,
    @Body() body: { message: string },
  ) {
    return this.eventService.bulkBroadcast(
      req.user.tenantId,
      id,
      req.user.id,
      body.message,
    );
  }

  @Post(":id/invite")
  invite(
    @Req() req: any,
    @Param("id") id: string,
    @Body() dto: SendEventInviteDto,
  ) {
    return this.eventService.sendEventInvites(
      req.user.tenantId,
      id,
      req.user.id,
      dto,
    );
  }

  @Get(":id/campaign-stats")
  getCampaignStats(@Req() req: any, @Param("id") id: string) {
    return this.analyticsService.getEventConversionStats(req.user.tenantId, id);
  }

  @Post(":id/reminder")
  reminder(
    @Req() req: any,
    @Param("id") id: string,
    @Body() body: { scheduledAt: string; message: string },
  ) {
    return this.eventService.scheduleReminder(
      req.user.tenantId,
      id,
      req.user.id,
      new Date(body.scheduledAt),
      body.message,
    );
  }

  @Post(":id/sync-metadata")
  syncMetadata(@Req() req: any, @Param("id") id: string) {
    return this.eventService.syncMetadata(req.user.tenantId, id);
  }

  @Post(":id/notify-exhibitors")
  batchNotifyExhibitors(@Req() req: any, @Param("id") id: string) {
    return this.eventService.batchNotifyExhibitors(req.user.tenantId, id);
  }

  @Post("backfill-all")
  backfillAll(@Req() req: any) {
    // Note: We might want to restrict this to system admins, but for now organization-scoped backfill
    // or global backfill if tenantId allows.
    return this.eventService.backfillAllPublishedEvents();
  }
}
