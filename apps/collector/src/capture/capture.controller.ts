/**
 * =============================================================================
 * CAPTURE CONTROLLER
 * =============================================================================
 * 
 * Handles HTTP requests for the event capture endpoint.
 * This is the main entry point for all analytics events from client SDKs.
 * 
 * ENDPOINT: POST /v1/capture
 * 
 * REQUEST FLOW:
 * ------------
 * 1. Client SDK sends batch of events
 * 2. WriteKeyGuard validates the write key and origin
 * 3. ValidationPipe validates the request body against CaptureBatchDto
 * 4. Rate limiter checks request count
 * 5. Controller extracts IP address
 * 6. Service publishes events to Redis queue
 * 7. Return 200 OK
 * 
 * SECURITY:
 * --------
 * - Write key authentication via WriteKeyGuard
 * - Origin validation (CORS)
 * - Rate limiting via @Throttle decorator
 * - Request validation via ValidationPipe
 */

import {
  Controller,
  Post,
  Body,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { Throttle } from '@nestjs/throttler';
import { WriteKeyGuard, CurrentProject, Project } from '@lib/common';
import { CaptureBatchDto } from '@lib/events';
import { CaptureService } from './capture.service';

/**
 * @Controller('capture')
 * Route prefix: /capture
 * Combined with global prefix /v1: /v1/capture
 */
@Controller('capture')
export class CaptureController {
  constructor(private readonly captureService: CaptureService) {}

  /**
   * POST /v1/capture
   * ----------------
   * Receives a batch of analytics events from client SDKs.
   * 
   * DECORATORS EXPLAINED:
   * 
   * @Post() - This method handles HTTP POST requests
   * 
   * @HttpCode(HttpStatus.OK) - Returns 200 instead of default 201 for POST
   *   (201 is for "created a resource", but we're not creating REST resources)
   * 
   * @UseGuards(WriteKeyGuard) - Applies authentication guard
   *   Guards run BEFORE the handler. If they return false or throw,
   *   the request is rejected.
   * 
   * @Throttle() - Rate limiting specific to this endpoint
   *   Overrides the global throttle settings if needed.
   * 
   * PARAMETER DECORATORS:
   * 
   * @Body() - Extracts and validates the request body
   *   The CaptureBatchDto defines the expected structure.
   * 
   * @CurrentProject() - Custom decorator that extracts the authenticated project
   *   This is set by WriteKeyGuard after validating the write key.
   * 
   * @Req() - Provides access to the raw Fastify request object
   *   Used here to extract the client's IP address.
   * 
   * @param dto - Validated request body containing batch of events
   * @param project - The authenticated project (from WriteKeyGuard)
   * @param request - Raw Fastify request for IP extraction
   * @returns Success response
   */
  @Post()
  @HttpCode(HttpStatus.OK)
  @UseGuards(WriteKeyGuard)
  @Throttle({ default: { limit: 100, ttl: 60000 } })
  async capture(
    @Body() dto: CaptureBatchDto,
    @CurrentProject() project: Project,
    @Req() request: FastifyRequest,
  ) {
    // Extract client IP address for geo-enrichment
    const ipAddress = this.extractIpAddress(request);

    // Delegate to service for processing
    await this.captureService.processBatch(dto, project, ipAddress);

    return { status: 'success' };
  }

  /**
   * Extract the client's IP address from the request.
   * 
   * WHY X-FORWARDED-FOR?
   * -------------------
   * When your API is behind a load balancer or reverse proxy (like Nginx),
   * the request.ip shows the proxy's IP, not the client's.
   * 
   * The X-Forwarded-For header contains the original client IP:
   * "client-ip, proxy1-ip, proxy2-ip"
   * 
   * We take the first one (the original client).
   * 
   * @param request - The Fastify request object
   * @returns The client's IP address
   */
  private extractIpAddress(request: FastifyRequest): string | undefined {
    const forwarded = request.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
      return forwarded.split(',')[0].trim();
    }
    return request.ip;
  }
}
