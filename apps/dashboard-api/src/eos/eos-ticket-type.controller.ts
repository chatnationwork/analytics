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
import { EosTicketTypeService } from "./eos-ticket-type.service";

@Controller("eos/events/:eventId/ticket-types")
@UseGuards(JwtAuthGuard)
export class EosTicketTypeController {
  constructor(private readonly service: EosTicketTypeService) {}

  @Post()
  create(
    @Req() req: any,
    @Param("eventId") eventId: string,
    @Body() body: any,
  ) {
    return this.service.create(eventId, body);
  }

  @Get()
  findAll(@Param("eventId") eventId: string) {
    return this.service.findAll(eventId);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() body: any) {
    return this.service.update(id, body);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.service.remove(id);
  }
}
