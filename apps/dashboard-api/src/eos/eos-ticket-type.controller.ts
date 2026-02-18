import {
  Controller,
  Post,
  Body,
  Param,
  Request,
  UseGuards,
  Req,
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { EosTicketType } from "@lib/database";

@Controller("eos/events/:eventId/ticket-types")
@UseGuards(JwtAuthGuard)
export class EosTicketTypeController {
  constructor(
    @InjectRepository(EosTicketType)
    private readonly repo: Repository<EosTicketType>,
  ) {}

  @Post()
  create(
    @Req() req: any,
    @Param("eventId") eventId: string,
    @Body() body: any,
  ) {
    // Basic CRUD stub for now, as no specific service method was mandated in brief for this,
    // but endpoint was listed.
    const entity = this.repo.create({ ...body, eventId });
    return this.repo.save(entity);
  }
}
