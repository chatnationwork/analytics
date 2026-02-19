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

@Controller()
export class EosTicketController {
  constructor(private readonly ticketService: EosTicketService) {}

  @Post("eos/events/:eventId/tickets/purchase")
  @UseGuards(JwtAuthGuard) // Assuming purchase needs auth? Brief says "Attendee submits registration form".
  // If public, might need to relax guard or use different one.
  // Brief says "All endpoints require a JWT bearer token." so keeping guard.
  initiatePurchase(
    @Req() req: any,
    @Param("eventId") eventId: string,
    @Body() dto: InitiatePurchaseDto,
  ) {
    const organizationId = req.user.tenantId; // Use tenantId from JWT
    // Actually, initiatePurchase validates ticketType -> event -> organizationId matching.
    // Attendee might not belong to Org. This usually implies public access.
    // Sticking to brief "All endpoints require a JWT". Maybe user logs in as "Attendee"?
    return this.ticketService.initiatePurchase(organizationId, dto);
  }

  @Get("eos/tickets/:id/status")
  @UseGuards(JwtAuthGuard)
  getStatus(@Param("id") id: string) {
    return this.ticketService.getStatus(id);
  }

  @Post("eos/tickets/check-in")
  @UseGuards(JwtAuthGuard)
  checkIn(@Body() body: { ticketCode: string }) {
    if (!body.ticketCode) {
      throw new BadRequestException("ticketCode is required");
    }
    return this.ticketService.checkIn(body.ticketCode);
  }
}
