import { Controller, Get, UseGuards, Request, Query } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { WhatsappService } from './whatsapp.service';

@Controller('whatsapp')
@UseGuards(JwtAuthGuard)
export class WhatsappController {
  constructor(private readonly whatsappService: WhatsappService) {}

  @Get('overview')
  async getOverview(@Request() req: any) {
    return this.whatsappService.getOverview(req.user.tenantId);
  }

  @Get('campaigns')
  async getCampaigns(
    @Request() req: any,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.whatsappService.getCampaigns(
      req.user.tenantId,
      page ? Number(page) : 1,
      limit ? Number(limit) : 20,
    );
  }

  @Get('contacts')
  async getContacts(
    @Request() req: any,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.whatsappService.getContacts(
      req.user.tenantId,
      page ? Number(page) : 1,
      limit ? Number(limit) : 20,
    );
  }
}
