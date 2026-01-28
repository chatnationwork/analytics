/**
 * =============================================================================
 * JOURNEYS ANALYTICS MODULE
 * =============================================================================
 *
 * NestJS module for self-serve vs assisted journey analytics.
 */

import { Module } from "@nestjs/common";
import { DatabaseModule } from "@lib/database";
import { JourneysController } from "./journeys.controller";
import { JourneysService } from "./journeys.service";

@Module({
  imports: [DatabaseModule.forFeature()],
  controllers: [JourneysController],
  providers: [JourneysService],
  exports: [JourneysService],
})
export class JourneysModule {}
