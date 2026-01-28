import { Controller, Get, Query, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TrendsService } from './trends.service';

type Granularity = 'day' | 'week' | 'month';

@Controller('trends')
@UseGuards(JwtAuthGuard)
export class TrendsController {
  constructor(private readonly trendsService: TrendsService) {}

  /**
   * GET /trends/sessions
   * Get session count trend over time.
   */
  @Get('sessions')
  async getSessionTrend(
    @Request() req: any,
    @Query('granularity') granularity?: string,
    @Query('periods') periods?: string,
  ) {
    return this.trendsService.getSessionTrend(
      req.user.tenantId,
      (granularity as Granularity) || 'day',
      periods ? parseInt(periods, 10) : 30,
    );
  }

  /**
   * GET /trends/conversions
   * Get conversion rate trend over time.
   */
  @Get('conversions')
  async getConversionTrend(
    @Request() req: any,
    @Query('granularity') granularity?: string,
    @Query('periods') periods?: string,
  ) {
    return this.trendsService.getConversionTrend(
      req.user.tenantId,
      (granularity as Granularity) || 'day',
      periods ? parseInt(periods, 10) : 30,
    );
  }

  /**
   * GET /trends/user-growth
   * Get new vs returning users trend.
   */
  @Get('user-growth')
  async getUserGrowthTrend(
    @Request() req: any,
    @Query('granularity') granularity?: string,
    @Query('periods') periods?: string,
  ) {
    return this.trendsService.getUserGrowthTrend(
      req.user.tenantId,
      (granularity as Granularity) || 'day',
      periods ? parseInt(periods, 10) : 30,
    );
  }

  /**
   * GET /trends/session-duration
   * Get average session duration trend.
   */
  @Get('session-duration')
  async getSessionDurationTrend(
    @Request() req: any,
    @Query('granularity') granularity?: string,
    @Query('periods') periods?: string,
  ) {
    return this.trendsService.getSessionDurationTrend(
      req.user.tenantId,
      (granularity as Granularity) || 'day',
      periods ? parseInt(periods, 10) : 30,
    );
  }

  /**
   * GET /trends/daily-active-users
   * Get daily active users trend.
   */
  @Get('daily-active-users')
  async getDailyActiveUsersTrend(
    @Request() req: any,
    @Query('periods') periods?: string,
  ) {
    return this.trendsService.getDailyActiveUsersTrend(
      req.user.tenantId,
      periods ? parseInt(periods, 10) : 30,
    );
  }
}
