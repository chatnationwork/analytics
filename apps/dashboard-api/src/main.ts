/**
 * =============================================================================
 * DASHBOARD API - APPLICATION ENTRY POINT
 * =============================================================================
 *
 * This is the main entry point for the Dashboard API application.
 * It bootstraps (starts) the NestJS application with all its configuration.
 *
 * WHAT HAPPENS AT STARTUP:
 * -----------------------
 * 1. NestFactory.create() creates the application instance
 * 2. We configure global pipes, interceptors, and filters
 * 3. We enable CORS for browser access
 * 4. We set the global API prefix
 * 5. The app starts listening for HTTP requests
 *
 * WHY FASTIFY?
 * -----------
 * NestJS supports two HTTP adapters:
 * - Express (default): Most popular, lots of middleware available
 * - Fastify: ~2x faster, async-first design, better for high-traffic APIs
 *
 * We use Fastify for better performance with analytics workloads.
 */

import { NestFactory } from "@nestjs/core";
import {
  FastifyAdapter,
  NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { ValidationPipe, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import multipart from "@fastify/multipart";
import { DashboardModule } from "./dashboard.module";
import { HttpExceptionFilter, ResponseInterceptor } from "@lib/common";

/**
 * Bootstrap function
 * ------------------
 * An async function that starts the application.
 *
 * We use async/await because starting a server involves async operations
 * like connecting to databases and binding to network ports.
 */
async function bootstrap() {
  // Create a Logger instance for startup messages
  const logger = new Logger("DashboardAPI");

  /**
   * Create the NestJS application
   * -----------------------------
   * NestFactory.create() takes:
   * - The root module (DashboardModule)
   * - Optional: An HTTP adapter (FastifyAdapter for Fastify)
   *
   * The generic type <NestFastifyApplication> tells TypeScript
   * this app uses Fastify, giving us Fastify-specific methods.
   */
  const app = await NestFactory.create<NestFastifyApplication>(
    DashboardModule,
    new FastifyAdapter({ logger: false }), // Disable Fastify's built-in logger
  );

  const configService = app.get(ConfigService);
  const port = configService.get<number>("app.dashboardApiPort", 3001);

  await app
    .getHttpAdapter()
    .getInstance()
    .register(multipart, {
      limits: {
        fileSize: configService.get<number>(
          "media.maxFileSizeBytes",
          10 * 1024 * 1024,
        ),
      },
    });

  /**
   * Global Validation Pipe
   * ----------------------
   * ValidationPipe automatically validates incoming request bodies
   * against DTO (Data Transfer Object) classes using class-validator.
   *
   * Options:
   * - whitelist: true - Strips properties not in the DTO (security)
   * - transform: true - Converts types (string "5" -> number 5)
   */
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  /**
   * Global Response Interceptor
   * ---------------------------
   * Wraps all responses in a consistent format:
   * {
   *   "status": "success",
   *   "data": { ... actual response ... },
   *   "timestamp": "2024-01-15T10:30:00Z"
   * }
   */
  app.useGlobalInterceptors(new ResponseInterceptor());

  /**
   * Global Exception Filter
   * -----------------------
   * Catches all exceptions and formats them consistently:
   * {
   *   "status": "error",
   *   "statusCode": 500,
   *   "message": "Something went wrong",
   *   "timestamp": "2024-01-15T10:30:00Z"
   * }
   */
  app.useGlobalFilters(new HttpExceptionFilter());

  /**
   * CORS (Cross-Origin Resource Sharing)
   * ------------------------------------
   * Allows the dashboard UI (which runs on a different port/domain)
   * to make requests to this API.
   *
   * Without CORS, browsers would block requests from different origins
   * for security reasons.
   */
  app.enableCors({
    origin: true, // Allow all origins (configure properly in production)
    methods: ["GET", "POST", "OPTIONS"],
  });

  /**
   * Global Prefix
   * -------------
   * Adds a prefix to all routes.
   *
   * Without prefix: /overview, /funnel
   * With prefix: /api/dashboard/overview, /api/dashboard/funnel
   */
  app.setGlobalPrefix("api/dashboard");

  /**
   * Start the server
   * ----------------
   * Listen on the configured port, accepting connections from any IP ('0.0.0.0').
   *
   * Using '0.0.0.0' instead of 'localhost' allows Docker containers
   * and external machines to connect.
   */
  await app.listen(port, "0.0.0.0");
  logger.log(`Dashboard API listening on port ${port}`);
}

// Start the application
bootstrap();
