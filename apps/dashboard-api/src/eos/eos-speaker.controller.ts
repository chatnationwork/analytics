import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Put,
  UseGuards,
  Req,
} from "@nestjs/common";
import { EosSpeakerService } from "./eos-speaker.service";
import { CreateSpeakerDto } from "./dto/create-speaker.dto";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";

@Controller("eos/events/:eventId/speakers")
@UseGuards(JwtAuthGuard)
export class EosSpeakerController {
  constructor(private readonly service: EosSpeakerService) {}

  @Post()
  create(
    @Req() req: any,
    @Param("eventId") eventId: string,
    @Body() dto: CreateSpeakerDto,
  ) {
    return this.service.create(req.user.organizationId, eventId, dto);
  }

  @Get()
  findAll(@Param("eventId") eventId: string) {
    return this.service.findAll(eventId);
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.service.findOne(id);
  }

  @Put(":id")
  update(@Param("id") id: string, @Body() dto: Partial<CreateSpeakerDto>) {
    return this.service.update(id, dto);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.service.delete(id);
  }
}
