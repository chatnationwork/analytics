/**
 * =============================================================================
 * COLLECTOR API - APPLICATION ENTRY POINT (main.ts)
 * =============================================================================
 * 
 * This is the main entry point for the Collector API.
 * The Collector is responsible for receiving analytics events from client SDKs.
 * 
 * HIGH-LEVEL ARCHITECTURE:
 * -----------------------
 * 
 *   Browser SDK                 Collector API              Redis Queue
 *       |                            |                          |
 *       |--- POST /v1/capture ------>|                          |
 *       |                            |--- Publish to Stream --->|
 *       |<-- 200 OK -----------------|                          |
 * 
 * The Collector needs to be FAST because it receives many events per second.
 * That's why:
 * - We use Fastify (faster than Express)
 * - We just validate and queue events (don't process them here)
 * - Processing happens asynchronously in the Processor worker
 */

import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CollectorModule } from './collector.module';
import { HttpExceptionFilter, LoggingInterceptor } from '@lib/common';

/**
 * Bootstrap the Collector API
 */
async function bootstrap() {
  const logger = new Logger('Collector');

  /**
   * Create application with Fastify adapter
   * Fastify is ~2x faster than Express for high-throughput APIs
   */
  const app = await NestFactory.create<NestFastifyApplication>(
    CollectorModule,
    new FastifyAdapter({ logger: false }),
  );

  const configService = app.get(ConfigService);
  const port = configService.get<number>('app.collectorPort', 3000);

  /**
   * Global Validation Pipe
   * ----------------------
   * Validates all incoming requests against DTO schemas.
   * 
   * Important options:
   * - whitelist: Removes properties not in the DTO (security!)
   * - forbidNonWhitelisted: Throws error for extra properties
   * - transform: Converts strings to correct types
   * - transformOptions.enableImplicitConversion: Auto-converts based on types
   */
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  /**
   * Exception Filter
   * ----------------
   * Ensures all errors return consistent JSON format
   */
  app.useGlobalFilters(new HttpExceptionFilter());

  /**
   * Logging Interceptor
   * -------------------
   * Logs every request with method, URL, status code, and response time.
   * Useful for debugging and monitoring.
   */
  app.useGlobalInterceptors(new LoggingInterceptor());

  /**
   * CORS Configuration
   * ------------------
   * Client SDKs running in browsers need CORS to make requests.
   * 
   * In production, you'd want to validate origins against allowedOrigins
   * stored in the project configuration. The WriteKeyGuard handles this.
   */
  app.enableCors({
    origin: true, // Allow requests, further validation in WriteKeyGuard
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'X-Write-Key'],
    credentials: true,
  });

  /**
   * Global Route Prefix
   * -------------------
   * All routes start with /v1 (versioned API)
   * Routes become: /v1/capture, /v1/health
   */
  app.setGlobalPrefix('v1');

  await app.listen(port, '0.0.0.0');
  logger.log(`Collector API listening on port ${port}`);
}

bootstrap();
