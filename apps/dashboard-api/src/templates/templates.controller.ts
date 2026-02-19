import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Req,
  ParseUUIDPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { TemplatesService } from "./templates.service";
import { CreateTemplateDto } from "./dto/create-template.dto";

@Controller("templates")
@UseGuards(JwtAuthGuard)
export class TemplatesController {
  constructor(private readonly templatesService: TemplatesService) {}

  @Post("import")
  @HttpCode(HttpStatus.CREATED)
  async importTemplate(@Req() req: any, @Body() dto: CreateTemplateDto) {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id;
    if (!tenantId) throw new Error("Tenant context required");
    return this.templatesService.importTemplate(tenantId, userId, dto);
  }

  @Get()
  async list(@Req() req: any) {
    const tenantId = req.user?.tenantId;
    if (!tenantId) throw new Error("Tenant context required");
    return this.templatesService.list(tenantId);
  }

  @Get(":id")
  async findOne(@Req() req: any, @Param("id", ParseUUIDPipe) id: string) {
    const tenantId = req.user?.tenantId;
    if (!tenantId) throw new Error("Tenant context required");
    return this.templatesService.findById(tenantId, id);
  }

  @Delete(":id")
  async delete(@Req() req: any, @Param("id", ParseUUIDPipe) id: string) {
    const tenantId = req.user?.tenantId;
    if (!tenantId) throw new Error("Tenant context required");
    return this.templatesService.delete(tenantId, id);
  }
}
