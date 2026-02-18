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
    const organizationId = req.user.organizationId;
    return this.eventService.createEvent(organizationId, dto);
  }

  @Get(":id")
  findOne(@Req() req: any, @Param("id") id: string) {
    const organizationId = req.user.organizationId;
    return this.eventService.findOne(organizationId, id);
  }

  @Patch(":id")
  update(@Req() req: any, @Param("id") id: string, @Body() updates: any) {
    const organizationId = req.user.organizationId;
    return this.eventService.update(organizationId, id, updates);
  }

  @Post(":id/publish")
  publish(@Req() req: any, @Param("id") id: string) {
    const organizationId = req.user.organizationId;
    return this.eventService.publishEvent(organizationId, id);
  }

  @Get(":id/venue-layout")
  getVenueLayout(@Req() req: any, @Param("id") id: string) {
    const organizationId = req.user.organizationId;
    return this.eventService.getVenueLayout(organizationId, id);
  }
}
