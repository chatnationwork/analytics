import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Request,
  UseGuards,
  Req,
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { EosExhibitor } from "@lib/database";

@Controller("eos/events/:eventId/exhibitors")
@UseGuards(JwtAuthGuard)
export class EosExhibitorController {
  constructor(
    @InjectRepository(EosExhibitor)
    private readonly repo: Repository<EosExhibitor>,
  ) {}

  @Post()
  create(
    @Req() req: any,
    @Param("eventId") eventId: string,
    @Body() body: any,
  ) {
    const entity = this.repo.create({ ...body, eventId });
    return this.repo.save(entity);
  }

  @Get()
  list(@Param("eventId") eventId: string) {
    return this.repo.find({ where: { eventId } });
  }
}
