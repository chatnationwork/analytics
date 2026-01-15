/**
 * =============================================================================
 * HEALTH CONTROLLER
 * =============================================================================
 * 
 * Provides a simple health check endpoint for monitoring.
 * 
 * ENDPOINT: GET /v1/health
 * 
 * RESPONSE:
 * {
 *   "status": "ok",
 *   "version": "1.0.0",
 *   "timestamp": "2024-01-15T10:30:00.000Z"
 * }
 * 
 * BEST PRACTICES:
 * --------------
 * - Keep it simple and fast (no database calls)
 * - Include version for debugging deployments
 * - Include timestamp to confirm responses are fresh
 */

import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  /**
   * GET /v1/health
   * --------------
   * Returns the health status of the Collector service.
   * 
   * This endpoint:
   * - Should always return quickly (no blocking operations)
   * - Should return 200 if the service is healthy
   * - Is called frequently by load balancers (every 10-30 seconds)
   * 
   * @returns Health status object
   */
  @Get()
  check() {
    return {
      status: 'ok',              // Service is healthy
      version: '1.0.0',          // Current version
      timestamp: new Date().toISOString(), // Current time
    };
  }
}
