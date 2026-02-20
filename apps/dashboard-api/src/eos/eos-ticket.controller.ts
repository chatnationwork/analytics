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

  @Post("check-in")
  @UseGuards(JwtAuthGuard)
  checkIn(@Body() body: { ticketCode: string }) {
    if (!body.ticketCode) {
      throw new BadRequestException("ticketCode is required");
    }
    return this.ticketService.checkIn(body.ticketCode);
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
