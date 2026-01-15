/**
 * =============================================================================
 * DASHBOARD API - ROOT MODULE
 * =============================================================================
 * 
 * This is the root module of the Dashboard API application.
 * It imports and configures all the feature modules needed for the API.
 * 
 * APPLICATION ARCHITECTURE:
 * -------------------------
 * NestJS applications are organized as a tree of modules:
 * 
 *                    DashboardModule (root)
 *                          |
 *    +-----------+---------+---------+-----------+
 *    |           |         |         |           |
 * ConfigModule DatabaseModule OverviewModule FunnelModule SessionsModule EventsModule
 * 
 * The root module imports all other modules, making their controllers
 * and services available to the application.
 * 
 * IMPORTS EXPLAINED:
 * -----------------
 * - ConfigModule: Loads environment variables (.env file)
 * - DatabaseModule: Provides database connection and repositories
 * - Feature modules: Handle specific API endpoints
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { appConfig, databaseConfig } from '@lib/common';
import { DatabaseModule } from '@lib/database';
import { OverviewModule } from './overview/overview.module';
import { FunnelModule } from './funnel/funnel.module';
import { SessionsModule } from './sessions/sessions.module';
import { EventsModule } from './events/events.module';

/**
 * @Module() - Root module decorator
 * 
 * The 'imports' array is special for the root module:
 * - It loads core infrastructure modules (Config, Database)
 * - It loads all feature modules
 * - Everything imported here becomes available app-wide
 */
@Module({
  imports: [
    /**
     * ConfigModule.forRoot()
     * ----------------------
     * Loads configuration from environment variables and .env files.
     * 
     * Options:
     * - isGlobal: true - Makes config available everywhere without re-importing
     * - load: Array of config functions that return typed config objects
     * 
     * The 'load' option uses our custom config functions from @lib/common
     * which define how env vars map to config values.
     */
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig],
    }),

    /**
     * DatabaseModule.forRoot()
     * ------------------------
     * Sets up the database connection using TypeORM.
     * 
     * This is a "dynamic module" - it's configured differently depending
     * on how you call it (forRoot vs forFeature).
     * 
     * .forRoot() - Used once in the root module, creates the connection
     * .forFeature() - Used in feature modules to access specific repositories
     */
    DatabaseModule.forRoot(),

    // Feature modules - each handles a specific part of the API
    OverviewModule,  // GET /api/dashboard/overview
    FunnelModule,    // GET /api/dashboard/funnel
    SessionsModule,  // GET /api/dashboard/sessions
    EventsModule,    // GET /api/dashboard/events
  ],
})
export class DashboardModule {}
