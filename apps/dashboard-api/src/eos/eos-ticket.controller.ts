import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Req,
  BadRequestException,
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { EosTicketService } from "./eos-ticket.service";
import { InitiatePurchaseDto } from "./dto/initiate-purchase.dto";

@Controller("eos/events/:eventId/tickets")
export class EosTicketController {
  constructor(private readonly ticketService: EosTicketService) {}

  @Post("purchase")
  @UseGuards(JwtAuthGuard)
  initiatePurchase(
    @Req() req: any,
    @Param("eventId") eventId: string,
    @Body() dto: InitiatePurchaseDto,
  ) {
    const organizationId = req.user.tenantId;
    return this.ticketService.initiatePurchase(organizationId, dto);
  }

  @Get(":id/status")
  @UseGuards(JwtAuthGuard)
  getStatus(@Param("id") id: string) {
    return this.ticketService.getStatus(id);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  listTickets(@Param("eventId") eventId: string) {
    return this.ticketService.findAll(eventId);
  }

  @Post(":id/resend")
  @UseGuards(JwtAuthGuard)
  async resendTicket(@Param("id") id: string) {
    await this.ticketService.resendTicket(id);
    return { success: true };
  }

  @Get("locations")
  @UseGuards(JwtAuthGuard)
  getLocations(@Param("eventId") eventId: string) {
    return this.ticketService.getLocations(eventId);
  }

  @Post("locations")
  @UseGuards(JwtAuthGuard)
  createLocation(@Param("eventId") eventId: string, @Body() data: any) {
    return this.ticketService.createLocation(eventId, data);
  }

  @Get("scan-logs")
  @UseGuards(JwtAuthGuard)
  getScanLogs(@Param("eventId") eventId: string) {
    return this.ticketService.getScanLogs(eventId);
  }

  @Post("check-in")
  @UseGuards(JwtAuthGuard)
  checkIn(
    @Body() body: { ticketCode: string; locationId?: string },
  ) {
    if (!body.ticketCode) {
      throw new BadRequestException("ticketCode is required");
    }
    return this.ticketService.checkIn(body.ticketCode, body.locationId);
  }

  @Post("check-ins/bulk")
  @UseGuards(JwtAuthGuard)
  bulkCheckIn(
    @Param("eventId") eventId: string,
    @Body() body: { tickets: any[] },
  ) {
    if (!Array.isArray(body.tickets)) {
      throw new BadRequestException("tickets must be an array");
    }
    return this.ticketService.bulkCheckIn(eventId, body.tickets);
  }
}
