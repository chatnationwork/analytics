/**
 * =============================================================================
 * AGENT ANALYTICS SERVICE
 * =============================================================================
 *
 * Business logic for agent analytics - resolutions, transfers, performance, and team metrics.
 * Provides insights into agent productivity, workload distribution, and chat handling.
 */

import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, In } from "typeorm";
import {
  EventRepository,
  InboxSessionEntity,
  SessionStatus,
  ResolutionEntity,
  UserEntity,
  MessageEntity,
  MessageDirection,
} from "@lib/database";

type Granularity = "day" | "week" | "month";

@Injectable()
export class AgentInboxAnalyticsService {
  constructor(
    private readonly eventRepository: EventRepository,
    @InjectRepository(InboxSessionEntity)
    private readonly sessionRepo: Repository<InboxSessionEntity>,
    @InjectRepository(ResolutionEntity)
    private readonly resolutionRepo: Repository<ResolutionEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    @InjectRepository(MessageEntity)
    private readonly messageRepo: Repository<MessageEntity>,
  ) {}

  /**
   * Calculate start date based on granularity and periods.
   */
  private calculateStartDate(granularity: Granularity, periods: number): Date {
    const now = new Date();
    const startDate = new Date(now);

    switch (granularity) {
      case "day":
        startDate.setDate(now.getDate() - periods);
        break;
      case "week":
        startDate.setDate(now.getDate() - periods * 7);
        break;
      case "month":
        startDate.setMonth(now.getMonth() - periods);
        break;
    }

    startDate.setHours(0, 0, 0, 0);
    return startDate;
  }

  /**
   * Resolve start/end dates: use explicit startDate/endDate when both provided (ISO strings),
   * otherwise use granularity + periods.
   */
  private resolveDateRange(
    granularity: Granularity,
    periods: number,
    startDateStr?: string,
    endDateStr?: string,
  ): { startDate: Date; endDate: Date } {
    if (startDateStr && endDateStr) {
      const startDate = new Date(startDateStr);
      const endDate = new Date(endDateStr);
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
      return { startDate, endDate };
    }
    const endDate = new Date();
    const startDate = this.calculateStartDate(granularity, periods);
    return { startDate, endDate };
  }

  /** Fill resolution trend gaps so chart has one point per period (period as ISO string). */
  private fillResolutionTrendGaps(
    data: {
      period: Date | string;
      resolvedCount: number;
      activeAgents: number;
    }[],
    startDate: Date,
    endDate: Date,
    granularity: Granularity,
  ): { period: string; resolvedCount: number; activeAgents: number }[] {
    const toKey = (d: Date) => {
      const y = d.getUTCFullYear();
      const m = String(d.getUTCMonth() + 1).padStart(2, "0");
      const day = String(d.getUTCDate()).padStart(2, "0");
      if (granularity === "day") return `${y}-${m}-${day}`;
      if (granularity === "week") {
        const jan1 = new Date(Date.UTC(y, 0, 1));
        const weekNo = Math.ceil(
          (d.getTime() - jan1.getTime()) / (7 * 24 * 60 * 60 * 1000),
        );
        return `${y}-W${weekNo}`;
      }
      return `${y}-${m}`;
    };
    const map = new Map<
      string,
      { resolvedCount: number; activeAgents: number }
    >();
    for (const row of data) {
      const p =
        typeof row.period === "string" ? new Date(row.period) : row.period;
      map.set(toKey(p), {
        resolvedCount: row.resolvedCount,
        activeAgents: row.activeAgents,
      });
    }
    const out: {
      period: string;
      resolvedCount: number;
      activeAgents: number;
    }[] = [];
    const curr = new Date(startDate);
    curr.setUTCHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setUTCHours(23, 59, 59, 999);
    while (curr <= end) {
      const key = toKey(curr);
      const row = map.get(key) ?? { resolvedCount: 0, activeAgents: 0 };
      out.push({ period: curr.toISOString(), ...row });
      if (granularity === "day") curr.setUTCDate(curr.getUTCDate() + 1);
      else if (granularity === "week") curr.setUTCDate(curr.getUTCDate() + 7);
      else curr.setUTCMonth(curr.getUTCMonth() + 1);
    }
    return out;
  }

  /** Fill transfer trend gaps so chart has one point per period (period as ISO string). */
  private fillTransferTrendGaps(
    data: { period: Date | string; transferCount: number }[],
    startDate: Date,
    endDate: Date,
    granularity: Granularity,
  ): { period: string; transferCount: number }[] {
    const toKey = (d: Date) => {
      const y = d.getUTCFullYear();
      const m = String(d.getUTCMonth() + 1).padStart(2, "0");
      const day = String(d.getUTCDate()).padStart(2, "0");
      if (granularity === "day") return `${y}-${m}-${day}`;
      if (granularity === "week") {
        const jan1 = new Date(Date.UTC(y, 0, 1));
        const weekNo = Math.ceil(
          (d.getTime() - jan1.getTime()) / (7 * 24 * 60 * 60 * 1000),
        );
        return `${y}-W${weekNo}`;
      }
      return `${y}-${m}`;
    };
    const map = new Map<string, number>();
    for (const row of data) {
      const p =
        typeof row.period === "string" ? new Date(row.period) : row.period;
      map.set(toKey(p), row.transferCount);
    }
    const out: { period: string; transferCount: number }[] = [];
    const curr = new Date(startDate);
    curr.setUTCHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setUTCHours(23, 59, 59, 999);
    while (curr <= end) {
      const key = toKey(curr);
      out.push({
        period: curr.toISOString(),
        transferCount: map.get(key) ?? 0,
      });
      if (granularity === "day") curr.setUTCDate(curr.getUTCDate() + 1);
      else if (granularity === "week") curr.setUTCDate(curr.getUTCDate() + 7);
      else curr.setUTCMonth(curr.getUTCMonth() + 1);
    }
    return out;
  }

  /**
   * Get resolution analytics overview.
   */
  async getResolutionOverview(
    tenantId: string,
    granularity: Granularity = "day",
    periods: number = 30,
    startDateStr?: string,
    endDateStr?: string,
  ) {
    const { startDate, endDate } = this.resolveDateRange(
      granularity,
      periods,
      startDateStr,
      endDateStr,
    );

    const stats = await this.eventRepository.getResolutionStats(
      tenantId,
      startDate,
      endDate,
    );

    // Get previous period for comparison
    const prevEndDate = new Date(startDate);
    const prevStartDate = this.calculateStartDate(granularity, periods * 2);
    const prevStats = await this.eventRepository.getResolutionStats(
      tenantId,
      prevStartDate,
      prevEndDate,
    );

    const percentChange =
      prevStats.totalResolved > 0
        ? ((stats.totalResolved - prevStats.totalResolved) /
            prevStats.totalResolved) *
          100
        : 0;

    return {
      ...stats,
      percentChange,
      startDate,
      endDate,
      granularity,
    };
  }

  /**
   * Get resolution trend over time. Fills gaps so chart has one point per period.
   */
  async getResolutionTrend(
    tenantId: string,
    granularity: Granularity = "day",
    periods: number = 30,
    startDateStr?: string,
    endDateStr?: string,
  ) {
    const { startDate, endDate } = this.resolveDateRange(
      granularity,
      periods,
      startDateStr,
      endDateStr,
    );

    const raw = await this.eventRepository.getResolutionTrend(
      tenantId,
      startDate,
      endDate,
      granularity,
    );

    const data = this.fillResolutionTrendGaps(
      raw,
      startDate,
      endDate,
      granularity,
    );

    const totalResolved = data.reduce(
      (sum: number, d: { resolvedCount: number }) => sum + d.resolvedCount,
      0,
    );

    const midpoint = Math.floor(data.length / 2);
    const firstHalf = data.slice(0, midpoint);
    const secondHalf = data.slice(midpoint);

    const firstHalfTotal = firstHalf.reduce(
      (sum: number, d: { resolvedCount: number }) => sum + d.resolvedCount,
      0,
    );
    const secondHalfTotal = secondHalf.reduce(
      (sum: number, d: { resolvedCount: number }) => sum + d.resolvedCount,
      0,
    );

    const percentChange =
      firstHalfTotal > 0
        ? ((secondHalfTotal - firstHalfTotal) / firstHalfTotal) * 100
        : 0;

    return {
      data,
      summary: {
        totalResolved,
        avgPerPeriod:
          data.length > 0 ? Math.round(totalResolved / data.length) : 0,
        percentChange,
      },
      startDate,
      endDate,
      granularity,
    };
  }

  /**
   * Get resolution breakdown by category.
   */
  async getResolutionByCategory(
    tenantId: string,
    granularity: Granularity = "day",
    periods: number = 30,
    startDateStr?: string,
    endDateStr?: string,
  ) {
    const { startDate, endDate } = this.resolveDateRange(
      granularity,
      periods,
      startDateStr,
      endDateStr,
    );

    const data = await this.eventRepository.getResolutionByCategory(
      tenantId,
      startDate,
      endDate,
    );

    const totalResolved = data.reduce(
      (sum: number, d: { count: number }) => sum + d.count,
      0,
    );

    const enrichedData = data.map((d: { category: string; count: number }) => ({
      ...d,
      percentage: totalResolved > 0 ? (d.count / totalResolved) * 100 : 0,
    }));

    return {
      data: enrichedData,
      summary: {
        totalResolved,
        uniqueCategories: data.length,
      },
      startDate,
      endDate,
    };
  }

  /**
   * List individual resolutions (wrap-up submissions) so analytics can show each filled report.
   * Note: resolutions table does not contain tenantId; we join via session.tenantId.
   */
  async getResolutionSubmissions(
    tenantId: string,
    granularity: Granularity = "day",
    periods: number = 30,
    page: number = 1,
    limit: number = 20,
    startDateStr?: string,
    endDateStr?: string,
  ): Promise<{
    data: Array<{
      id: string;
      sessionId: string;
      contactId: string;
      contactName: string | null;
      category: string;
      outcome: string;
      notes: string | null;
      formData: Record<string, string | number | boolean> | null;
      resolvedByAgentId: string;
      resolvedByAgentName: string | null;
      createdAt: string;
    }>;
    total: number;
    page: number;
    limit: number;
    startDate: string;
    endDate: string;
    granularity: string;
  }> {
    const { startDate, endDate } = this.resolveDateRange(
      granularity,
      periods,
      startDateStr,
      endDateStr,
    );

    const qb = this.resolutionRepo
      .createQueryBuilder("r")
      .innerJoinAndSelect("r.session", "s")
      .where("s.tenantId = :tenantId", { tenantId })
      .andWhere("r.createdAt BETWEEN :start AND :end", {
        start: startDate,
        end: endDate,
      })
      .orderBy("r.createdAt", "DESC")
      .skip((Math.max(page, 1) - 1) * limit)
      .take(limit);

    const [rows, total] = await qb.getManyAndCount();

    const agentIds = [
      ...new Set(rows.map((r) => r.resolvedByAgentId).filter(Boolean)),
    ];
    const users =
      agentIds.length > 0
        ? await this.userRepo.find({ where: { id: In(agentIds) } })
        : [];
    const nameMap = new Map(users.map((u) => [u.id, u.name ?? null]));

    return {
      data: rows.map((r) => ({
        id: r.id,
        sessionId: r.sessionId,
        contactId: r.session?.contactId ?? "",
        contactName: r.session?.contactName ?? null,
        category: r.category,
        outcome: r.outcome,
        notes: r.notes ?? null,
        formData: r.formData ?? null,
        resolvedByAgentId: r.resolvedByAgentId,
        resolvedByAgentName: nameMap.get(r.resolvedByAgentId) ?? null,
        createdAt: r.createdAt.toISOString(),
      })),
      total,
      page: Math.max(page, 1),
      limit,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      granularity,
    };
  }

  /**
   * Get transfer analytics overview.
   */
  async getTransferOverview(
    tenantId: string,
    granularity: Granularity = "day",
    periods: number = 30,
    startDateStr?: string,
    endDateStr?: string,
  ) {
    const { startDate, endDate } = this.resolveDateRange(
      granularity,
      periods,
      startDateStr,
      endDateStr,
    );

    const stats = await this.eventRepository.getTransferStats(
      tenantId,
      startDate,
      endDate,
    );

    // Get previous period for comparison
    const prevEndDate = new Date(startDate);
    const prevStartDate = this.calculateStartDate(granularity, periods * 2);
    const prevStats = await this.eventRepository.getTransferStats(
      tenantId,
      prevStartDate,
      prevEndDate,
    );

    const percentChange =
      prevStats.totalTransfers > 0
        ? ((stats.totalTransfers - prevStats.totalTransfers) /
            prevStats.totalTransfers) *
          100
        : 0;

    return {
      ...stats,
      percentChange,
      startDate,
      endDate,
      granularity,
    };
  }

  /**
   * Get transfer trend over time. Fills gaps so chart has one point per period.
   */
  async getTransferTrend(
    tenantId: string,
    granularity: Granularity = "day",
    periods: number = 30,
    startDateStr?: string,
    endDateStr?: string,
  ) {
    const { startDate, endDate } = this.resolveDateRange(
      granularity,
      periods,
      startDateStr,
      endDateStr,
    );

    const raw = await this.eventRepository.getTransferTrend(
      tenantId,
      startDate,
      endDate,
      granularity,
    );

    const data = this.fillTransferTrendGaps(
      raw,
      startDate,
      endDate,
      granularity,
    );

    const totalTransfers = data.reduce(
      (sum: number, d: { transferCount: number }) => sum + d.transferCount,
      0,
    );

    const midpoint = Math.floor(data.length / 2);
    const firstHalf = data.slice(0, midpoint);
    const secondHalf = data.slice(midpoint);

    const firstHalfTotal = firstHalf.reduce(
      (sum: number, d: { transferCount: number }) => sum + d.transferCount,
      0,
    );
    const secondHalfTotal = secondHalf.reduce(
      (sum: number, d: { transferCount: number }) => sum + d.transferCount,
      0,
    );

    const percentChange =
      firstHalfTotal > 0
        ? ((secondHalfTotal - firstHalfTotal) / firstHalfTotal) * 100
        : 0;

    return {
      data,
      summary: {
        totalTransfers,
        avgPerPeriod:
          data.length > 0 ? Math.round(totalTransfers / data.length) : 0,
        percentChange,
      },
      startDate,
      endDate,
      granularity,
    };
  }

  /**
   * Get transfer breakdown by reason.
   */
  async getTransferByReason(
    tenantId: string,
    granularity: Granularity = "day",
    periods: number = 30,
    startDateStr?: string,
    endDateStr?: string,
  ) {
    const { startDate, endDate } = this.resolveDateRange(
      granularity,
      periods,
      startDateStr,
      endDateStr,
    );

    const data = await this.eventRepository.getTransferByReason(
      tenantId,
      startDate,
      endDate,
    );

    const totalTransfers = data.reduce(
      (sum: number, d: { count: number }) => sum + d.count,
      0,
    );

    const enrichedData = data.map((d: { reason: string; count: number }) => ({
      ...d,
      percentage: totalTransfers > 0 ? (d.count / totalTransfers) * 100 : 0,
    }));

    return {
      data: enrichedData,
      summary: {
        totalTransfers,
        uniqueReasons: data.length,
      },
      startDate,
      endDate,
    };
  }

  /** 23h 59m expiry window - matches inbox service */
  private static readonly SESSION_EXPIRY_MS = (24 * 60 - 1) * 60 * 1000;

  /** Expiry = 24h from last inbound (incl. orphans); same as inbox.service */
  private static readonly EFFECTIVE_LAST_INBOUND_SQL = `COALESCE(session."lastInboundMessageAt", (SELECT MAX(m."createdAt") FROM messages m WHERE m."tenantId" = session."tenantId" AND m."contactId" = session."contactId" AND m.direction = 'inbound'))`;

  /**
   * Get expired chat statistics (chats with no user engagement for 23h59m+).
   */
  async getExpiredChatsOverview(tenantId: string) {
    const cutoff = new Date(Date.now() - AgentInboxAnalyticsService.SESSION_EXPIRY_MS);

    // Count currently expired chats (based on last user engagement, incl. orphans)
    const expiredCount = await this.sessionRepo
      .createQueryBuilder("session")
      .where("session.tenantId = :tenantId", { tenantId })
      .andWhere("session.status = :status", {
        status: SessionStatus.ASSIGNED,
      })
      .andWhere(
        `${AgentInboxAnalyticsService.EFFECTIVE_LAST_INBOUND_SQL} IS NOT NULL AND ${AgentInboxAnalyticsService.EFFECTIVE_LAST_INBOUND_SQL} <= :cutoff`,
        { cutoff },
      )
      .getCount();

    // Count all assigned chats
    const assignedCount = await this.sessionRepo.count({
      where: {
        tenantId,
        status: SessionStatus.ASSIGNED,
      },
    });

    // Count resolved chats
    const resolvedCount = await this.sessionRepo.count({
      where: {
        tenantId,
        status: SessionStatus.RESOLVED,
      },
    });

    // Count unassigned chats
    const unassignedCount = await this.sessionRepo.count({
      where: {
        tenantId,
        status: SessionStatus.UNASSIGNED,
      },
    });

    const totalChats = assignedCount + resolvedCount + unassignedCount;
    const activeChats = assignedCount - expiredCount;

    return {
      expiredCount,
      activeChats,
      assignedCount,
      resolvedCount,
      unassignedCount,
      totalChats,
      expiredRate: assignedCount > 0 ? (expiredCount / assignedCount) * 100 : 0,
    };
  }

  /**
   * Get re-engagement analytics: sent count, reply rate, time to reply, by agent.
   * Uses messages with metadata.reengagement = true.
   */
  async getReengagementAnalytics(
    tenantId: string,
    startDateStr?: string,
    endDateStr?: string,
  ) {
    const startDate = startDateStr
      ? new Date(startDateStr)
      : this.calculateStartDate("day", 30);
    const endDate = endDateStr
      ? new Date(endDateStr)
      : new Date();
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);

    const rows = await this.messageRepo.manager.query(
      `
      SELECT r.id, r."senderId", r."contactId", r."createdAt" as reeng_at,
             reply."createdAt" as reply_at,
             reply.content as reply_content,
             reply.type as reply_type
      FROM messages r
      LEFT JOIN LATERAL (
        SELECT m."createdAt", m.content, m.type
        FROM messages m
        WHERE m."contactId" = r."contactId"
          AND m.direction = 'inbound'
          AND m."createdAt" > r."createdAt"
          AND m."tenantId" = r."tenantId"
        ORDER BY m."createdAt" ASC
        LIMIT 1
      ) reply ON true
      WHERE r."tenantId" = $1
        AND r.direction = 'outbound'
        AND (r.metadata->>'reengagement') = 'true'
        AND r."createdAt" >= $2
        AND r."createdAt" <= $3
      ORDER BY r."createdAt" DESC
      `,
      [tenantId, startDate, endDate],
    );

    const totalSent = rows.length;
    const withReply = rows.filter((r: { reply_at: string | null }) => r.reply_at != null);
    const repliedCount = withReply.length;
    const replyRate = totalSent > 0 ? (repliedCount / totalSent) * 100 : 0;

    let avgTimeToReplyMinutes: number | null = null;
    if (withReply.length > 0) {
      const totalMinutes = withReply.reduce(
        (sum: number, r: { reeng_at: string; reply_at: string }) => {
          const reeng = new Date(r.reeng_at).getTime();
          const reply = new Date(r.reply_at).getTime();
          return sum + (reply - reeng) / (60 * 1000);
        },
        0,
      );
      avgTimeToReplyMinutes = Math.round(totalMinutes / withReply.length);
    }

    const byAgentMap = new Map<
      string,
      { sent: number; replied: number }
    >();
    for (const r of rows) {
      const agentId = r.senderId ?? "unknown";
      const entry = byAgentMap.get(agentId) ?? { sent: 0, replied: 0 };
      entry.sent++;
      if (r.reply_at) entry.replied++;
      byAgentMap.set(agentId, entry);
    }

    const agentIds = [...byAgentMap.keys()].filter((id) => id !== "unknown");
    const users =
      agentIds.length > 0
        ? await this.userRepo.find({ where: { id: In(agentIds) } })
        : [];
    const nameByAgentId = new Map(
      users.map((u) => [u.id, u.name ?? null]),
    );

    const byAgent = [...byAgentMap.entries()].map(
      ([agentId, counts]) => ({
        agentId,
        agentName: nameByAgentId.get(agentId) ?? null,
        sent: counts.sent,
        replied: counts.replied,
        replyRate: counts.sent > 0 ? (counts.replied / counts.sent) * 100 : 0,
      }),
    );

    const recentReplies = withReply.slice(0, 10).map(
      (r: {
        reeng_at: string;
        reply_at: string;
        reply_content: string | null;
        reply_type: string | null;
      }) => {
        const reeng = new Date(r.reeng_at).getTime();
        const reply = new Date(r.reply_at).getTime();
        const minutes = Math.round((reply - reeng) / (60 * 1000));
        return {
          reengagedAt: r.reeng_at,
          repliedAt: r.reply_at,
          timeToReplyMinutes: minutes,
          replyContent: r.reply_content ?? null,
          replyType: r.reply_type ?? "text",
        };
      },
    );

    return {
      totalSent,
      repliedCount,
      replyRate,
      avgTimeToReplyMinutes,
      byAgent,
      recentReplies,
      startDate,
      endDate,
    };
  }

  /**
   * Get agent performance leaderboard.
   */
  async getAgentLeaderboard(
    tenantId: string,
    granularity: Granularity = "day",
    periods: number = 30,
    limit: number = 10,
    startDateStr?: string,
    endDateStr?: string,
  ) {
    const { startDate, endDate } = this.resolveDateRange(
      granularity,
      periods,
      startDateStr,
      endDateStr,
    );

    const data = await this.eventRepository.getAgentResolutionLeaderboard(
      tenantId,
      startDate,
      endDate,
      limit,
    );

    const agentIds = [
      ...new Set(
        data.map((d: { agentId: string }) => d.agentId).filter(Boolean),
      ),
    ];
    const users =
      agentIds.length > 0
        ? await this.userRepo.find({ where: { id: In(agentIds) } })
        : [];
    const nameByAgentId = new Map(
      users.map((u) => [u.id, u.name ?? null]),
    );

    const dataWithNames = data.map(
      (d: { agentId: string; resolvedCount: number; transfersIn: number; transfersOut: number; categories?: string[] }) => ({
        ...d,
        agentName: nameByAgentId.get(d.agentId) ?? null,
      }),
    );

    const totalResolved = dataWithNames.reduce(
      (sum: number, d: { resolvedCount: number }) => sum + d.resolvedCount,
      0,
    );

    return {
      data: dataWithNames,
      summary: {
        totalResolved,
        totalAgents: data.length,
        avgResolutionsPerAgent:
          data.length > 0 ? Math.round(totalResolved / data.length) : 0,
      },
      startDate,
      endDate,
      granularity,
    };
  }

  /**
   * Get combined dashboard stats for quick overview.
   */
  async getDashboardStats(
    tenantId: string,
    granularity: Granularity = "day",
    periods: number = 30,
    startDateStr?: string,
    endDateStr?: string,
  ) {
    const { startDate, endDate } = this.resolveDateRange(
      granularity,
      periods,
      startDateStr,
      endDateStr,
    );

    const [resolutions, transfers, expiredChats, agentSummary] =
      await Promise.all([
        this.getResolutionOverview(
          tenantId,
          granularity,
          periods,
          startDateStr,
          endDateStr,
        ),
        this.getTransferOverview(
          tenantId,
          granularity,
          periods,
          startDateStr,
          endDateStr,
        ),
        this.getExpiredChatsOverview(tenantId),
        this.eventRepository.getAgentPerformanceSummary(
          tenantId,
          startDate,
          endDate,
        ),
      ]);

    return {
      resolutions: {
        total: resolutions.totalResolved,
        uniqueAgents: resolutions.uniqueAgents,
        percentChange: resolutions.percentChange,
      },
      transfers: {
        total: transfers.totalTransfers,
        percentChange: transfers.percentChange,
      },
      chats: {
        expired: expiredChats.expiredCount,
        active: expiredChats.activeChats,
        resolved: expiredChats.resolvedCount,
        unassigned: expiredChats.unassignedCount,
        total: expiredChats.totalChats,
        expiredRate: expiredChats.expiredRate,
      },
      agents: {
        activeAgents: agentSummary.agentsWithResolutions,
        totalHandoffs: agentSummary.totalHandoffs,
        resolutionRate: agentSummary.resolutionRate,
        avgResolutionsPerAgent: agentSummary.avgResolutionsPerAgent,
      },
      startDate: resolutions.startDate,
      endDate: resolutions.endDate,
      granularity,
    };
  }

  // ===========================================================================
  // AGENT PERFORMANCE ANALYTICS
  // ===========================================================================

  /**
   * Get agent activity trend (active agents per period).
   */
  async getAgentActivityTrend(
    tenantId: string,
    granularity: Granularity = "day",
    periods: number = 30,
    startDateStr?: string,
    endDateStr?: string,
  ) {
    const { startDate, endDate } = this.resolveDateRange(
      granularity,
      periods,
      startDateStr,
      endDateStr,
    );

    const data = await this.eventRepository.getAgentActivityTrend(
      tenantId,
      startDate,
      endDate,
      granularity,
    );

    const totalActiveAgents = Math.max(
      ...data.map((d: { activeAgents: number }) => d.activeAgents),
      0,
    );
    const avgActiveAgents =
      data.length > 0
        ? data.reduce(
            (sum: number, d: { activeAgents: number }) => sum + d.activeAgents,
            0,
          ) / data.length
        : 0;

    return {
      data,
      summary: {
        peakActiveAgents: totalActiveAgents,
        avgActiveAgents: Math.round(avgActiveAgents * 10) / 10,
      },
      startDate,
      endDate,
      granularity,
    };
  }

  /**
   * Get detailed stats for all agents.
   */
  async getAgentDetailedStats(
    tenantId: string,
    granularity: Granularity = "day",
    periods: number = 30,
    startDateStr?: string,
    endDateStr?: string,
  ) {
    const { startDate, endDate } = this.resolveDateRange(
      granularity,
      periods,
      startDateStr,
      endDateStr,
    );

    const data = await this.eventRepository.getAgentDetailedStats(
      tenantId,
      startDate,
      endDate,
    );

    const agentIds = [
      ...new Set(
        data.map((d: { agentId: string }) => d.agentId).filter(Boolean),
      ),
    ];
    const users =
      agentIds.length > 0
        ? await this.userRepo.find({ where: { id: In(agentIds) } })
        : [];
    const nameByAgentId = new Map(
      users.map((u) => [u.id, u.name ?? null]),
    );

    const totalChatsHandled = data.reduce(
      (sum: number, d: { totalChatsHandled: number }) =>
        sum + d.totalChatsHandled,
      0,
    );

    // Calculate resolution rate (Resolved / Total) and attach agent name for each agent
    const enrichedData = data.map(
      (d: {
        agentId: string;
        resolvedCount: number;
        handoffsReceived: number;
        transfersOut: number;
        transfersIn: number;
        totalChatsHandled: number;
      }) => ({
        ...d,
        agentName: nameByAgentId.get(d.agentId) ?? null,
        resolutionRate:
          d.totalChatsHandled > 0
            ? Math.round(
                (d.resolvedCount / d.totalChatsHandled) * 1000,
              ) / 10
            : 0,
      }),
    );

    return {
      data: enrichedData,
      summary: {
        totalAgents: data.length,
        totalChatsHandled,
        avgChatsPerAgent:
          data.length > 0 ? Math.round(totalChatsHandled / data.length) : 0,
      },
      startDate,
      endDate,
      granularity,
    };
  }

  /**
   * Get agent workload distribution.
   */
  async getAgentWorkloadDistribution(
    tenantId: string,
    granularity: Granularity = "day",
    periods: number = 30,
    startDateStr?: string,
    endDateStr?: string,
  ) {
    const { startDate, endDate } = this.resolveDateRange(
      granularity,
      periods,
      startDateStr,
      endDateStr,
    );

    const data = await this.eventRepository.getAgentWorkloadDistribution(
      tenantId,
      startDate,
      endDate,
    );

    // Calculate workload balance score (lower stddev relative to avg = better balance)
    const workloadBalanceScore =
      data.avgChatsPerAgent > 0
        ? Math.max(0, 100 - (data.stddevChats / data.avgChatsPerAgent) * 50)
        : 0;

    return {
      ...data,
      workloadBalanceScore: Math.round(workloadBalanceScore),
      startDate,
      endDate,
      granularity,
    };
  }

  /**
   * Get agent performance summary.
   */
  async getAgentPerformanceSummary(
    tenantId: string,
    granularity: Granularity = "day",
    periods: number = 30,
    startDateStr?: string,
    endDateStr?: string,
  ) {
    const { startDate, endDate } = this.resolveDateRange(
      granularity,
      periods,
      startDateStr,
      endDateStr,
    );

    const current = await this.eventRepository.getAgentPerformanceSummary(
      tenantId,
      startDate,
      endDate,
    );

    // Get previous period for comparison
    const prevEndDate = new Date(startDate);
    const prevStartDate = this.calculateStartDate(granularity, periods * 2);
    const previous = await this.eventRepository.getAgentPerformanceSummary(
      tenantId,
      prevStartDate,
      prevEndDate,
    );

    const resolutionRateChange =
      previous.resolutionRate > 0
        ? ((current.resolutionRate - previous.resolutionRate) /
            previous.resolutionRate) *
          100
        : 0;

    return {
      ...current,
      resolutionRateChange,
      startDate,
      endDate,
      granularity,
    };
  }

  /**
   * Get agent performance metrics for the date range.
   * Chats still Active at end of period are counted as Unresolved for performance tracking.
   * - Assigned: sessions assigned in period (assignedAt in range).
   * - Resolved: sessions resolved in period (resolution createdAt in range).
   * - Unresolved: assigned in period but not resolved in period (includes still-active at end of day/shift).
   * - Expired: assigned in period, still ASSIGNED, no message in last 24h (as of endDate).
   * - 1st Response: avg minutes from acceptedAt to first outbound message (sessions with both in range).
   * - Resolution time: avg minutes from acceptedAt to resolution createdAt (resolutions in range).
   */
  async getAgentPerformanceMetrics(
    tenantId: string,
    granularity: Granularity = "day",
    periods: number = 30,
    startDateStr?: string,
    endDateStr?: string,
  ): Promise<{
    assigned: number;
    resolved: number;
    unresolved: number;
    expired: number;
    avgFirstResponseMinutes: number | null;
    avgResolutionTimeMinutes: number | null;
    startDate: Date;
    endDate: Date;
    granularity: string;
  }> {
    const { startDate, endDate } = this.resolveDateRange(
      granularity,
      periods,
      startDateStr,
      endDateStr,
    );

    const endDatePlusOne = new Date(endDate);
    endDatePlusOne.setDate(endDatePlusOne.getDate() + 1);
    const expiredThreshold = new Date(endDate);
    expiredThreshold.setHours(expiredThreshold.getHours() - 24);

    const [assignedRow] = await this.sessionRepo.query(
      `SELECT COUNT(*)::int AS cnt FROM inbox_sessions
       WHERE "tenantId" = $1 AND "assignedAt" IS NOT NULL AND "assignedAt" >= $2 AND "assignedAt" < $3`,
      [tenantId, startDate, endDatePlusOne],
    );
    const assigned = assignedRow?.cnt ?? 0;

    const [resolvedRow] = await this.resolutionRepo.query(
      `SELECT COUNT(*)::int AS cnt FROM resolutions r
       INNER JOIN inbox_sessions s ON s.id = r."sessionId"
       WHERE s."tenantId" = $1 AND r."createdAt" >= $2 AND r."createdAt" < $3`,
      [tenantId, startDate, endDatePlusOne],
    );
    const resolved = resolvedRow?.cnt ?? 0;

    const unresolved = Math.max(0, assigned - resolved);

    const [expiredRow] = await this.sessionRepo.query(
      `SELECT COUNT(*)::int AS cnt FROM inbox_sessions s
       WHERE s."tenantId" = $1 AND s.status = $2 AND s."assignedAt" IS NOT NULL
         AND s."assignedAt" >= $3 AND s."assignedAt" < $4
         AND COALESCE(s."lastInboundMessageAt", (SELECT MAX(m."createdAt") FROM messages m WHERE m."tenantId" = s."tenantId" AND m."contactId" = s."contactId" AND m.direction = 'inbound')) IS NOT NULL
         AND COALESCE(s."lastInboundMessageAt", (SELECT MAX(m."createdAt") FROM messages m WHERE m."tenantId" = s."tenantId" AND m."contactId" = s."contactId" AND m.direction = 'inbound')) < $5`,
      [tenantId, SessionStatus.ASSIGNED, startDate, endDatePlusOne, expiredThreshold],
    );
    const expired = expiredRow?.cnt ?? 0;

    const [firstResponseRow] = await this.messageRepo.query(
      `WITH first_outbound AS (
         SELECT m."sessionId", MIN(m."createdAt") AS first_at
         FROM messages m
         INNER JOIN inbox_sessions s ON s.id = m."sessionId"
         WHERE s."tenantId" = $1 AND m.direction = $2
           AND s."acceptedAt" IS NOT NULL
           AND s."acceptedAt" >= $3 AND s."acceptedAt" < $4
         GROUP BY m."sessionId"
       )
       SELECT AVG(EXTRACT(EPOCH FROM (f.first_at - s."acceptedAt")) / 60)::float AS avg_mins
       FROM first_outbound f
       INNER JOIN inbox_sessions s ON s.id = f."sessionId"`,
      [tenantId, MessageDirection.OUTBOUND, startDate, endDatePlusOne],
    );
    const avgFirstResponseMinutes =
      firstResponseRow?.avg_mins != null && !isNaN(firstResponseRow.avg_mins)
        ? Math.round(firstResponseRow.avg_mins * 10) / 10
        : null;

    const [resolutionTimeRow] = await this.resolutionRepo.query(
      `SELECT AVG(EXTRACT(EPOCH FROM (r."createdAt" - s."acceptedAt")) / 60)::float AS avg_mins
       FROM resolutions r
       INNER JOIN inbox_sessions s ON s.id = r."sessionId"
       WHERE s."tenantId" = $1 AND s."acceptedAt" IS NOT NULL
         AND r."createdAt" >= $2 AND r."createdAt" < $3`,
      [tenantId, startDate, endDatePlusOne],
    );
    const avgResolutionTimeMinutes =
      resolutionTimeRow?.avg_mins != null && !isNaN(resolutionTimeRow.avg_mins)
        ? Math.round(resolutionTimeRow.avg_mins * 10) / 10
        : null;

    return {
      assigned,
      resolved,
      unresolved,
      expired,
      avgFirstResponseMinutes,
      avgResolutionTimeMinutes,
      startDate,
      endDate,
      granularity,
    };
  }
}
