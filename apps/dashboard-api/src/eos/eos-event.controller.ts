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

@Controller("eos/events")
@UseGuards(JwtAuthGuard)
export class EosEventController {
  constructor(private readonly eventService: EosEventService) {}

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
}
