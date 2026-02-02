/**
 * Agent presence – go online/offline, updates agent_sessions and agent_profiles.status.
 */

import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import {
  AgentSessionRepository,
  AgentProfileEntity,
  AgentStatus,
} from "@lib/database";

@Injectable()
export class PresenceService {
  constructor(
    private readonly agentSessionRepo: AgentSessionRepository,
    @InjectRepository(AgentProfileEntity)
    private readonly agentProfileRepo: Repository<AgentProfileEntity>,
  ) {}

  async goOnline(
    tenantId: string,
    agentId: string,
  ): Promise<{ sessionId: string; startedAt: Date }> {
    const existing = await this.agentSessionRepo.getActiveSession(
      tenantId,
      agentId,
    );
    if (existing) {
      return { sessionId: existing.id, startedAt: existing.startedAt };
    }
    const session = await this.agentSessionRepo.startSession(tenantId, agentId);
    await this.upsertAgentProfileStatus(agentId, AgentStatus.ONLINE);
    return { sessionId: session.id, startedAt: session.startedAt };
  }

  async goOffline(
    tenantId: string,
    agentId: string,
  ): Promise<{ endedAt: Date } | null> {
    const session = await this.agentSessionRepo.endSession(tenantId, agentId);
    await this.upsertAgentProfileStatus(agentId, AgentStatus.OFFLINE);
    return session ? { endedAt: session.endedAt! } : null;
  }

  private async upsertAgentProfileStatus(
    agentId: string,
    status: AgentStatus,
  ): Promise<void> {
    let profile = await this.agentProfileRepo.findOne({
      where: { userId: agentId },
    });
    if (!profile) {
      profile = this.agentProfileRepo.create({ userId: agentId, status });
      await this.agentProfileRepo.save(profile);
    } else {
      profile.status = status;
      await this.agentProfileRepo.save(profile);
    }
  }
}
