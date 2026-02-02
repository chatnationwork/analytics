/**
 * Agent session repository – presence (online/offline) and session history with metrics.
 */

import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, IsNull } from "typeorm";
import { AgentSessionEntity } from "../entities/agent-session.entity";

export interface AgentSessionWithMetrics extends AgentSessionEntity {
  durationMinutes?: number;
  chatsReceived?: number;
  chatsResolved?: number;
  messagesSent?: number;
}

@Injectable()
export class AgentSessionRepository {
  constructor(
    @InjectRepository(AgentSessionEntity)
    private readonly repo: Repository<AgentSessionEntity>,
  ) {}

  /** Start an agent session (go online). Returns the new session. */
  async startSession(
    tenantId: string,
    agentId: string,
  ): Promise<AgentSessionEntity> {
    const session = this.repo.create({
      tenantId,
      agentId,
      startedAt: new Date(),
      endedAt: null,
    });
    return this.repo.save(session);
  }

  /** End the current open session for an agent (go offline). Returns the updated session or null. */
  async endSession(
    tenantId: string,
    agentId: string,
  ): Promise<AgentSessionEntity | null> {
    const open = await this.repo.findOne({
      where: { tenantId, agentId, endedAt: IsNull() },
      order: { startedAt: "DESC" },
    });
    if (!open) return null;
    open.endedAt = new Date();
    return this.repo.save(open);
  }

  /** Get the current open session for an agent, if any. */
  async getActiveSession(
    tenantId: string,
    agentId: string,
  ): Promise<AgentSessionEntity | null> {
    return this.repo.findOne({
      where: { tenantId, agentId, endedAt: IsNull() },
      order: { startedAt: "DESC" },
    });
  }

  /** Get all agents who currently have an open session (online). */
  async getOnlineAgentIds(tenantId: string): Promise<string[]> {
    const rows = await this.repo
      .createQueryBuilder("s")
      .select("DISTINCT s.agentId")
      .where("s.tenantId = :tenantId", { tenantId })
      .andWhere("s.endedAt IS NULL")
      .getRawMany();
    return rows.map((r: { agentId: string }) => r.agentId);
  }

  /**
   * Get session history with optional metrics (chats received, resolved are computed by the caller
   * using inbox_sessions.assignedAt and resolutions.createdAt; this repo just returns sessions).
   */
  async getSessionHistory(
    tenantId: string,
    options: {
      agentId?: string;
      startDate?: Date;
      endDate?: Date;
      page?: number;
      limit?: number;
    } = {},
  ): Promise<{ data: AgentSessionEntity[]; total: number }> {
    const { agentId, startDate, endDate, page = 1, limit = 20 } = options;
    const qb = this.repo
      .createQueryBuilder("s")
      .where("s.tenantId = :tenantId", { tenantId })
      .orderBy("s.startedAt", "DESC");

    if (agentId) qb.andWhere("s.agentId = :agentId", { agentId });
    if (startDate) qb.andWhere("s.startedAt >= :startDate", { startDate });
    if (endDate) qb.andWhere("s.startedAt <= :endDate", { endDate });

    const total = await qb.getCount();
    const data = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();
    return { data, total };
  }
}
