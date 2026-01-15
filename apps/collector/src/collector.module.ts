/**
 * =============================================================================
 * COLLECTOR ROOT MODULE
 * =============================================================================
 * 
 * The root module for the Collector API.
 * Configures all the infrastructure and imports feature modules.
 * 
 * MODULE STRUCTURE:
 * ----------------
 *                     CollectorModule (root)
 *                            |
 *     +----------+-----------+-----------+----------+
 *     |          |           |           |          |
 * ConfigModule ThrottlerModule QueueModule CaptureModule HealthModule
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { appConfig, databaseConfig, redisConfig, rateLimitConfig } from '@lib/common';
import { QueueModule } from '@lib/queue';
import { CaptureModule } from './capture/capture.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    /**
     * Configuration Module
     * --------------------
     * Loads configuration from .env files and environment variables.
     * 
     * isGlobal: true - Makes ConfigService available everywhere
     * load: Array of config factory functions that return typed config
     */
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, redisConfig, rateLimitConfig],
    }),

    /**
     * Throttler Module (Rate Limiting)
     * --------------------------------
     * Prevents abuse by limiting how many requests a client can make.
     * 
     * Configuration:
     * - ttl: 60000ms (1 minute window)
     * - limit: 100 requests per window
     * 
     * If a client exceeds 100 requests/minute, they get HTTP 429 (Too Many Requests)
     */
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // Time window in milliseconds
        limit: 100, // Maximum requests in that window
      },
    ]),

    /**
     * Queue Module (Producer Only)
     * ----------------------------
     * Sets up connection to Redis for publishing events to the queue.
     * 
     * We use .forProducer() because this app only SENDS events to the queue.
     * The Processor app uses .forConsumer() because it only RECEIVES events.
     */
    QueueModule.forProducer(),

    // Feature modules
    CaptureModule, // POST /v1/capture - Receive events from SDKs
    HealthModule,  // GET /v1/health - Health check for load balancers
    
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'packages/sdk/dist'),
      serveRoot: '/', // Serves at root (e.g. /analytics.js)
    }),
  ],
})
export class CollectorModule {}
