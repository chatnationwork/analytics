/**
 * =============================================================================
 * LOGGING INTERCEPTOR
 * =============================================================================
 * 
 * Logs HTTP request details including response time.
 * 
 * EXAMPLE OUTPUT:
 * --------------
 * [HTTP] POST /v1/capture 200 - 15ms
 * [HTTP] GET /api/dashboard/overview 200 - 45ms
 * 
 * WHY LOG REQUESTS?
 * ----------------
 * - Debugging: Track what requests are being made
 * - Performance: Identify slow endpoints
 * - Monitoring: See patterns in API usage
 * - Audit: Know what happened and when
 */

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { FastifyRequest, FastifyReply } from 'fastify';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  /**
   * Logger instance for HTTP logs.
   * 
   * NestJS Logger provides:
   * - Colored output in development
   * - JSON format in production (configurable)
   * - Context prefix (shown as [HTTP])
   */
  private readonly logger = new Logger('HTTP');

  /**
   * Intercept requests and log timing.
   * 
   * HOW IT WORKS:
   * ------------
   * 1. Record start time before handler runs
   * 2. Let handler process request
   * 3. After response, calculate duration
   * 4. Log the request details
   * 
   * TAP() OPERATOR:
   * --------------
   * tap() performs side effects without changing the response.
   * Perfect for logging, analytics, etc.
   */
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    // Get request and response objects
    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const response = context.switchToHttp().getResponse<FastifyReply>();

    const { method, url } = request;
    const startTime = Date.now();

    return next.handle().pipe(
      // tap() runs after the response but doesn't modify it
      tap(() => {
        const responseTime = Date.now() - startTime;
        this.logger.log(
          `${method} ${url} ${response.statusCode} - ${responseTime}ms`,
        );
      }),
    );
  }
}
