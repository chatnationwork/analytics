import { Module } from '@nestjs/common';
import { AiAnalyticsController } from './ai-analytics.controller';
import { AiAnalyticsService } from './ai-analytics.service';
import { DatabaseModule } from '@lib/database';

@Module({
  imports: [
    DatabaseModule.forFeature(),
  ],
  controllers: [AiAnalyticsController],
  providers: [AiAnalyticsService],
})
export class AiAnalyticsModule {}

