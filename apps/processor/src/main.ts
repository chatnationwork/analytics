/**
 * =============================================================================
 * PROCESSOR WORKER - APPLICATION ENTRY POINT
 * =============================================================================
 * 
 * This is NOT a web server - it's a background worker that processes events.
 * 
 * DIFFERENCE FROM COLLECTOR:
 * -------------------------
 * - Collector: HTTP server that receives requests from clients
 * - Processor: Background worker that consumes events from Redis queue
 * 
 * WHAT THIS WORKER DOES:
 * ---------------------
 * 1. Connects to Redis and listens for new events
 * 2. Enriches events with extra data (GeoIP, User-Agent parsing)
 * 3. Deduplicates events (prevents duplicates from retries)
 * 4. Inserts events into PostgreSQL database
 * 
 * WHY A SEPARATE WORKER?
 * ----------------------
 * - Processing takes time (database writes, API calls)
 * - We don't want slow processing to affect SDK response times
 * - Workers can be scaled independently of the API
 * - If the database is slow, events wait in the queue (not lost)
 * 
 * GRACEFUL SHUTDOWN:
 * -----------------
 * When the process receives SIGTERM or SIGINT (Ctrl+C):
 * 1. Stop consuming new events
 * 2. Finish processing current batch
 * 3. Close connections cleanly
 * 4. Exit
 */

import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { ProcessorModule } from './processor.module';
import { EventProcessorService } from './event-processor/event-processor.service';

async function bootstrap() {
  const logger = new Logger('Processor');

  /**
   * Create Application Context (Not HTTP Server)
   * --------------------------------------------
   * NestFactory.createApplicationContext() creates a NestJS app without
   * the HTTP layer. This is perfect for:
   * - Background workers
   * - CLI applications
   * - Scheduled tasks
   * 
   * We still get all of NestJS features (DI, modules, etc.) but no HTTP routes.
   */
  const app = await NestFactory.createApplicationContext(ProcessorModule);

  // Get the processor service from the DI container
  const processor = app.get(EventProcessorService);

  logger.log('Starting event processor worker...');

  // Start the worker (this runs until stopped)
  await processor.start();

  /**
   * Graceful Shutdown Handlers
   * -------------------------
   * SIGTERM: Sent by Docker/Kubernetes when stopping a container
   * SIGINT: Sent when you press Ctrl+C
   * 
   * We handle both to ensure clean shutdown in all scenarios.
   */
  process.on('SIGTERM', async () => {
    logger.log('Received SIGTERM, shutting down...');
    await processor.stop();
    await app.close();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    logger.log('Received SIGINT, shutting down...');
    await processor.stop();
    await app.close();
    process.exit(0);
  });
}

bootstrap();
