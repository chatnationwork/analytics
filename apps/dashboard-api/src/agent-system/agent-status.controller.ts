/**
 * Agent status viewership – list agents (online/offline), session history with metrics.
 * For dashboard/supervisors.
 */

import {
  Controller,
  Get,
  Patch,
  Body,
  Query,
  Request,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { AgentStatusService } from "./agent-status.service";

/** DTO for setting another agent's presence (admin/supervisor). */
class SetPresenceDto {
  targetUserId!: string;
  status!: "online" | "offline";
}

@Controller("agent/status")
@UseGuards(JwtAuthGuard)
export class AgentStatusController {
  constructor(private readonly agentStatusService: AgentStatusService) {}

  /**
   * List all agents for the tenant with current status (online/offline),
   * current session start (if online), last session end (if any).
   */
  @Get()
  async getAgentStatusList(@Request() req: { user: { tenantId: string } }) {
    return this.agentStatusService.getAgentStatusList(req.user.tenantId);
  }

  /**
   * Set another agent's presence (online/offline). Caller must be a tenant member.
   * Used so admins/supervisors can mark agents online or offline; offline agents are not assigned messages.
   */
  @Patch("presence")
  async setAgentPresence(
    @Request() req: { user: { tenantId: string } },
    @Body() dto: SetPresenceDto,
  ): Promise<{ ok: true }> {
    await this.agentStatusService.setAgentPresence(
      req.user.tenantId,
      dto.targetUserId,
      dto.status,
    );
    return { ok: true };
  }

  /**
   * Session history with metrics: duration, chats received, chats resolved per session.
   */
  @Get("sessions")
  async getSessionHistory(
    @Request() req: { user: { tenantId: string } },
    @Query("agentId") agentId?: string,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    return this.agentStatusService.getSessionHistoryWithMetrics(
      req.user.tenantId,
      {
        agentId,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        page: page ? parseInt(page, 10) : undefined,
        limit: limit ? parseInt(limit, 10) : undefined,
      },
    );
  }
}
