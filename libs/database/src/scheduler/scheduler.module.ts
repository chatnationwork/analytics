/**
 * SchedulerModule — NestJS module that exposes the reusable scheduling engine.
 *
 * Import this module into any feature module (e.g., CampaignsModule,
 * EventsModule, SurveysModule) that needs scheduling capabilities.
 * The module registers ScheduleEntity with TypeORM and provides
 * SchedulerService as a singleton.
 */

import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ScheduleEntity } from "./schedule.entity";
import { SchedulerService } from "./scheduler.service";

@Module({
  imports: [TypeOrmModule.forFeature([ScheduleEntity])],
  providers: [SchedulerService],
  exports: [SchedulerService],
})
export class SchedulerModule {}
