/**
 * External API for agent-session checks (e.g. Tax Agent system).
 * Provides GET /check?phone=... → { hasActiveSession }.
 * See docs/guides/agent-system-api-spec.md.
 */

import {
  Controller,
  Get,
  Query,
  UseGuards,
  BadRequestException,
  Request,
} from "@nestjs/common";
import { HandoverAuthGuard } from "../auth/handover-auth.guard";
import { InboxService } from "./inbox.service";

/** E.164-ish: digits only, 10–15 length. */
function isValidPhoneFormat(phone: string): boolean {
  const digits = phone.trim().replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 15;
}

function normalizePhone(phone: string): string {
  return phone.trim().replace(/\D/g, "");
}

@Controller("agent-session")
@UseGuards(HandoverAuthGuard)
export class AgentSessionController {
  constructor(private readonly inboxService: InboxService) {}

  /**
   * Check if a user (by phone) has an active agent session.
   * Used by external systems to decide whether to route messages to the agent system.
   */
  @Get("check")
  async checkActiveSession(
    @Query("phone") phone: string | undefined,
    @Query("tenantId") tenantId: string | undefined,
    @Request() req: { user?: { tenantId?: string } },
  ): Promise<{ hasActiveSession: boolean }> {
    if (phone === undefined || phone === null || String(phone).trim() === "") {
      throw new BadRequestException("Missing required parameter: phone");
    }
    const raw = String(phone).trim();
    if (!isValidPhoneFormat(raw)) {
      throw new BadRequestException("Invalid phone number format");
    }
    const normalized = normalizePhone(raw);
    const scopeTenantId = tenantId ?? req.user?.tenantId;
    const hasActiveSession = await this.inboxService.hasActiveAgentSession(
      normalized,
      scopeTenantId,
    );
    return { hasActiveSession };
  }
}
