/**
 * =============================================================================
 * OVERVIEW MODULE
 * =============================================================================
 * 
 * Organizes the overview feature's controller and service.
 * 
 * MODULE ORGANIZATION BEST PRACTICE:
 * ----------------------------------
 * Each feature should have its own module containing:
 * - A controller (handles HTTP)
 * - One or more services (handles business logic)
 * - DTOs (Data Transfer Objects for request/response validation)
 * 
 * This is called "Feature-Based Organization" and makes your code:
 * - Easy to navigate (everything for a feature is in one place)
 * - Easy to maintain (changes are isolated)
 * - Easy to test (you can test one feature at a time)
 */

import { Module } from '@nestjs/common';
import { OverviewController } from './overview.controller';
import { OverviewService } from './overview.service';

import { DatabaseModule } from '@lib/database';

@Module({
  imports: [DatabaseModule.forFeature()],
  controllers: [OverviewController],
  providers: [OverviewService],
})
export class OverviewModule {}
