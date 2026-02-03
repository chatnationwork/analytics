/**
 * =============================================================================
 * FUNNEL CONTROLLER
 * =============================================================================
 *
 * This controller handles HTTP requests for funnel analysis endpoints.
 *
 * WHAT IS A CONTROLLER IN NESTJS?
 * -------------------------------
 * Controllers are responsible for handling incoming HTTP requests and returning
 * responses to the client. They act as the "front door" of your API.
 *
 * Key responsibilities:
 * - Define routes (URLs that clients can access)
 * - Extract data from requests (query params, body, headers)
 * - Call services to do the actual work
 * - Return responses
 *
 * Controllers should be "thin" - they shouldn't contain business logic.
 * That logic belongs in services.
 *
 * OOP PRINCIPLES USED:
 * -------------------
 * - Single Responsibility: Only handles HTTP request/response
 * - Dependency Injection: FunnelService is injected via constructor
 * - Separation of Concerns: Delegates business logic to service
 */

import { Body, Controller, Post } from "@nestjs/common";
import { FunnelService } from "./funnel.service";
import { AnalyzeFunnelDto } from "./dto/analyze-funnel.dto";

@Controller("funnel")
export class FunnelController {
  constructor(private readonly funnelService: FunnelService) {}

  /**
   * POST /api/dashboard/funnel
   * --------------------------
   * Analyzes a dynamic funnel defined in the request body.
   *
   * @param body - The funnel definition (steps, date range, etc.)
   * @returns Funnel data with conversion rates
   */
  @Post()
  async analyze(@Body() body: AnalyzeFunnelDto) {
    return this.funnelService.analyze(
      body.tenantId || "default-tenant",
      body.steps,
      new Date(body.startDate),
      new Date(body.endDate),
      body.useJourneyFlags,
    );
  }
}
