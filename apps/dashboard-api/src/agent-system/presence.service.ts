/**
 * Agent presence – go online/offline, updates agent_sessions and agent_profiles.status.
 * When an agent goes online, queued (unassigned) sessions are assigned to available agents.
 */

import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import {
  AgentSessionRepository,
  AgentProfileEntity,
  AgentStatus,
} from "@lib/database";
import { AssignmentService } from "./assignment.service";

@Injectable()
export class PresenceService {
  private readonly logger = new Logger(PresenceService.name);

  constructor(
    private readonly agentSessionRepo: AgentSessionRepository,
    @InjectRepository(AgentProfileEntity)
    private readonly agentProfileRepo: Repository<AgentProfileEntity>,
    private readonly assignmentService: AssignmentService,
  ) {}

  async goOnline(
    tenantId: string,
    agentId: string,
    reason?: string | null,
  ): Promise<{ sessionId: string; startedAt: Date }> {
    const existing = await this.agentSessionRepo.getActiveSession(
      tenantId,
      agentId,
    );
    if (existing) {
      await this.upsertAgentProfileStatus(agentId, AgentStatus.ONLINE, reason);
      return { sessionId: existing.id, startedAt: existing.startedAt };
    }
    const session = await this.agentSessionRepo.startSession(tenantId, agentId);
    await this.upsertAgentProfileStatus(agentId, AgentStatus.ONLINE, reason);
    // Assign queued sessions to available agents (including this one)
    this.assignmentService
      .assignQueuedSessionsToAvailableAgents(tenantId)
      .catch((err) =>
        this.logger.warn("Queue assignment after goOnline failed", err),
      );
    return { sessionId: session.id, startedAt: session.startedAt };
  }

  async goOffline(
    tenantId: string,
    agentId: string,
    reason?: string | null,
  ): Promise<{ endedAt: Date } | null> {
    const session = await this.agentSessionRepo.endSession(tenantId, agentId);
    await this.upsertAgentProfileStatus(agentId, AgentStatus.OFFLINE, reason);
    return session ? { endedAt: session.endedAt! } : null;
  }

  /**
   * Get current agent presence status and reason (for header status dropdown).
   * If the agent has an open session, they are considered online regardless of profile.
   */
  async getStatus(
    tenantId: string,
    agentId: string,
  ): Promise<{ status: "online" | "offline"; reason: string | null }> {
    const activeSession = await this.agentSessionRepo.getActiveSession(
      tenantId,
      agentId,
    );
    const profile = await this.agentProfileRepo.findOne({
      where: { userId: agentId },
    });
    const status: "online" | "offline" =
      activeSession || profile?.status === AgentStatus.ONLINE
        ? "online"
        : "offline";
    const reason =
      profile?.statusReason != null && profile.statusReason !== ""
        ? profile.statusReason
        : null;
    return { status, reason };
  }

  private async upsertAgentProfileStatus(
    agentId: string,
    status: AgentStatus,
    reason?: string | null,
  ): Promise<void> {
    let profile = await this.agentProfileRepo.findOne({
      where: { userId: agentId },
    });
    if (!profile) {
      profile = this.agentProfileRepo.create({
        userId: agentId,
        status,
        statusReason: reason ?? null,
      });
      await this.agentProfileRepo.save(profile);
    } else {
      profile.status = status;
      profile.statusReason = reason ?? null;
      await this.agentProfileRepo.save(profile);
    }
  }
}
