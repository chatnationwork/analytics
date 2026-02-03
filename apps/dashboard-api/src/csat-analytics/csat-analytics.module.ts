import { Module } from "@nestjs/common";
import { DatabaseModule } from "@lib/database";
import { CsatAnalyticsController } from "./csat-analytics.controller";
import { CsatAnalyticsService } from "./csat-analytics.service";

@Module({
  imports: [DatabaseModule.forFeature()],
  controllers: [CsatAnalyticsController],
  providers: [CsatAnalyticsService],
  exports: [CsatAnalyticsService],
})
export class CsatAnalyticsModule {}
