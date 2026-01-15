/**
 * =============================================================================
 * FUNNEL MODULE
 * =============================================================================
 * 
 * This module bundles together the funnel-related controller and service.
 * 
 * WHAT IS A MODULE IN NESTJS?
 * ---------------------------
 * Modules are the fundamental building blocks of NestJS applications.
 * They organize your code into cohesive blocks of functionality.
 * 
 * Think of modules like folders in a file system - they group related files.
 * Each feature of your app typically has its own module:
 * - FunnelModule (funnel analysis)
 * - SessionsModule (session data)
 * - OverviewModule (dashboard overview)
 * 
 * KEY CONCEPT: Encapsulation
 * --------------------------
 * By default, everything in a module is private to that module.
 * To share providers with other modules, you must explicitly export them.
 * 
 * @Module() Decorator Properties:
 * - imports: Other modules this module depends on
 * - controllers: Controllers that handle HTTP requests
 * - providers: Services and other providers (created/injected by this module)
 * - exports: Providers to share with other modules that import this one
 */

import { Module } from '@nestjs/common';
import { FunnelController } from './funnel.controller';
import { FunnelService } from './funnel.service';

/**
 * @Module() Decorator
 * -------------------
 * Configures this class as a NestJS module.
 * 
 * This decorator takes a metadata object that tells NestJS:
 * - Which controllers to register (for handling routes)
 * - Which providers (services) to create and inject
 * - What to import from other modules
 * - What to export for other modules to use
 */
import { DatabaseModule } from '@lib/database';

@Module({
  /**
   * imports
   * -------
   * Import DatabaseModule to access repositories.
   */
  imports: [DatabaseModule.forFeature()],

  /**
   * controllers
   * -----------
   * Array of controller classes that belong to this module.
   * NestJS will automatically create instances of these controllers
   * and set up their routes.
   */
  controllers: [FunnelController],

  /**
   * providers
   * ---------
   * Array of providers (usually services) that:
   * 1. Will be created by the NestJS dependency injection system
   * 2. Can be injected into controllers or other services in this module
   * 3. Are scoped to this module (unless exported)
   * 
   * When you list FunnelService here, NestJS creates a single instance
   * and shares it everywhere it's needed (Singleton pattern).
   */
  providers: [FunnelService],
})
export class FunnelModule {}
