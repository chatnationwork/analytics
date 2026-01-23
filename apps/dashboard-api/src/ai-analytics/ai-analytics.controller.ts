import { Controller, Get, Request, UseGuards } from '@nestjs/common';
import { AiAnalyticsService } from './ai-analytics.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('ai-analytics')
@UseGuards(JwtAuthGuard)
export class AiAnalyticsController {
  constructor(private readonly aiAnalyticsService: AiAnalyticsService) {}

  @Get('stats')
  async getStats(@Request() req: any) {
    return this.aiAnalyticsService.getStats(req.user.tenantId);
  }

  @Get('intents')
  async getIntents(@Request() req: any) {
    return this.aiAnalyticsService.getIntentBreakdown(req.user.tenantId);
  }

  @Get('latency')
  async getLatency(@Request() req: any) {
    return this.aiAnalyticsService.getLatencyDistribution(req.user.tenantId);
  }

  @Get('errors')
  async getErrors(@Request() req: any) {
    return this.aiAnalyticsService.getErrorBreakdown(req.user.tenantId);
  }
}
