import { Module } from "@nestjs/common";
import { TrendsController } from "./trends.controller";
import { TrendsService } from "./trends.service";
import { DatabaseModule } from "@lib/database";

@Module({
  imports: [DatabaseModule.forFeature()],
  controllers: [TrendsController],
  providers: [TrendsService],
  exports: [TrendsService],
})
export class TrendsModule {}
