import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Request,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { EosLeadService } from "./eos-lead.service";

@Controller()
export class EosLeadController {
  constructor(private readonly leadService: EosLeadService) {}

  @Get("eos/exhibitors/:id/leads")
  @UseGuards(JwtAuthGuard)
  list(@Param("id") exhibitorId: string) {
    return this.leadService.listLeads(exhibitorId);
  }

  @Post("eos/leads/qr-scan")
  @UseGuards(JwtAuthGuard)
  handleQrScan(@Body() body: { contactId: string; exhibitorId: string }) {
    return this.leadService.captureLead(
      body.exhibitorId,
      body.contactId,
      "qr_scan",
    );
  }
}
