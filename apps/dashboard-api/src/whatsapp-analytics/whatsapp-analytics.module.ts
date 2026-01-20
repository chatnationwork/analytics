import { Module } from '@nestjs/common';
import { DatabaseModule } from '@lib/database';
import { WhatsappAnalyticsController } from './whatsapp-analytics.controller';
import { WhatsappAnalyticsService } from './whatsapp-analytics.service';

@Module({
  imports: [
    DatabaseModule.forFeature(),
  ],
  controllers: [WhatsappAnalyticsController],
  providers: [WhatsappAnalyticsService],
})
export class WhatsappAnalyticsModule {}
