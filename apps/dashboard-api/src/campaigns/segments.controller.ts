/**
 * SegmentsController -- CRUD API for saved contact segments.
 */

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Req,
  UseGuards,
  ParseUUIDPipe,
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { SegmentsService } from "./segments.service";
import { CreateSegmentDto } from "./dto/create-segment.dto";
import { UpdateSegmentDto } from "./dto/create-segment.dto";
import { AudienceFilterDto } from "./dto/create-campaign.dto";
import { Type } from "class-transformer";
import { ValidateNested, IsOptional } from "class-validator";

class PreviewBodyDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => AudienceFilterDto)
  filter?: AudienceFilterDto | null;
}

@Controller("campaigns/segments")
@UseGuards(JwtAuthGuard)
export class SegmentsController {
  constructor(private readonly segmentsService: SegmentsService) {}

  @Get()
  async list(@Req() req: any) {
    const tenantId = req.user?.tenantId;
    if (!tenantId) throw new Error("Tenant context required");
    return this.segmentsService.list(tenantId);
  }

  @Post()
  async create(@Req() req: any, @Body() dto: CreateSegmentDto) {
    const tenantId = req.user?.tenantId;
    if (!tenantId) throw new Error("Tenant context required");
    return this.segmentsService.create(tenantId, dto);
  }

  @Post("preview")
  async preview(@Req() req: any, @Body() body: PreviewBodyDto) {
    const tenantId = req.user?.tenantId;
    if (!tenantId) throw new Error("Tenant context required");
    return this.segmentsService.preview(
      tenantId,
      body?.filter as Parameters<SegmentsService["preview"]>[1],
    );
  }

  @Get(":id")
  async findOne(@Req() req: any, @Param("id", ParseUUIDPipe) id: string) {
    const tenantId = req.user?.tenantId;
    if (!tenantId) throw new Error("Tenant context required");
    return this.segmentsService.findById(tenantId, id);
  }

  @Patch(":id")
  async update(
    @Req() req: any,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateSegmentDto,
  ) {
    const tenantId = req.user?.tenantId;
    if (!tenantId) throw new Error("Tenant context required");
    return this.segmentsService.update(tenantId, id, dto);
  }

  @Delete(":id")
  async delete(@Req() req: any, @Param("id", ParseUUIDPipe) id: string) {
    const tenantId = req.user?.tenantId;
    if (!tenantId) throw new Error("Tenant context required");
    await this.segmentsService.delete(tenantId, id);
    return { success: true };
  }
}
