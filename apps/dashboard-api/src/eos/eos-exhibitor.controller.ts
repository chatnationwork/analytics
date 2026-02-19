import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { EosExhibitorService } from "./eos-exhibitor.service";
import { CreateExhibitorDto } from "./dto/create-exhibitor.dto";

@Controller("eos/events/:eventId/exhibitors")
@UseGuards(JwtAuthGuard)
export class EosExhibitorController {
  constructor(private readonly service: EosExhibitorService) {}

  @Post()
  create(
    @Req() req: any,
    @Param("eventId") eventId: string,
    @Body() dto: CreateExhibitorDto,
  ) {
    return this.service.create(eventId, dto);
  }

  @Post("invite")
  invite(
    @Req() req: any,
    @Param("eventId") eventId: string,
    @Body() dto: CreateExhibitorDto,
  ) {
    return this.service.invite(eventId, dto);
  }

  @Get()
  list(@Param("eventId") eventId: string) {
    return this.service.findAll(eventId);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() body: any) {
    return this.service.update(id, body);
  }

  @Patch(":id/approve")
  approve(@Param("id") id: string) {
    return this.service.updateStatus(id, "approved");
  }

  @Patch(":id/reject")
  reject(@Param("id") id: string) {
    return this.service.updateStatus(id, "rejected");
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.service.remove(id);
  }
}
