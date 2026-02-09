/**
 * =============================================================================
 * ASSIGNMENT SERVICE
 * =============================================================================
 *
 * Handles the logic for assigning chats to agents.
 * Supports multiple strategies: Round Robin, Load Balanced, Manual/Queue.
 */

import { Inject, Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import {
  InboxSessionEntity,
  SessionStatus,
  TeamEntity,
  TeamMemberEntity,
  AgentProfileEntity,
  AgentStatus,
  AssignmentConfigEntity,
  TenantMembershipEntity,
  MembershipRole,
  MessageDirection,
} from "@lib/database";
import { WhatsappService } from "../whatsapp/whatsapp.service";
import { SystemMessagesService } from "../system-messages/system-messages.service";
import { InboxService } from "./inbox.service";
import {
  AssignmentEngine,
  ASSIGNMENT_ENGINE_RULES,
  ROUND_ROBIN_CONTEXT_PROVIDER,
  type RoundRobinContextProvider,
} from "./assignment-engine";

export type AssignmentStrategy =
  | "round_robin"
  | "least_active"
  | "least_assigned"
  | "hybrid"
  | "load_balanced"
  | "manual";

interface AgentMetrics {
  activeCount: number;
  totalCount: number;
}

interface AgentDetail {
  id: string;
  name: string;
  createdAt: Date;
}

/**
 * Service responsible for assigning incoming chats to available agents.
 * Implements multiple assignment strategies that can be configured per team.
 */
@Injectable()
export class AssignmentService {
  private readonly logger = new Logger(AssignmentService.name);
  private readonly engine: AssignmentEngine;

  constructor(
    @InjectRepository(InboxSessionEntity)
    private readonly sessionRepo: Repository<InboxSessionEntity>,
    @InjectRepository(TeamEntity)
    private readonly teamRepo: Repository<TeamEntity>,
    @InjectRepository(TeamMemberEntity)
    private readonly memberRepo: Repository<TeamMemberEntity>,
    @InjectRepository(AgentProfileEntity)
    private readonly agentRepo: Repository<AgentProfileEntity>,
    @InjectRepository(AssignmentConfigEntity)
    private readonly configRepo: Repository<AssignmentConfigEntity>,
    @InjectRepository(TenantMembershipEntity)
    private readonly tenantMembershipRepo: Repository<TenantMembershipEntity>,
    private readonly whatsappService: WhatsappService,
    private readonly inboxService: InboxService,
    @Inject(ROUND_ROBIN_CONTEXT_PROVIDER)
    private readonly rrContext: RoundRobinContextProvider,
    private readonly systemMessages: SystemMessagesService,
  ) {
    this.engine = new AssignmentEngine({
      sessionRepo: this.sessionRepo,
      teamRepo: this.teamRepo,
      memberRepo: this.memberRepo,
      agentRepo: this.agentRepo,
      configRepo: this.configRepo,
      inboxService: this.inboxService,
      whatsappService: this.whatsappService,
      checkScheduleAvailability: (teamId) =>
        this.checkScheduleAvailability(teamId),
      getStrategyWithType: (tenantId, teamId) =>
        this.getStrategyWithType(tenantId, teamId),
      getAvailableAgents: (tenantId, teamId) =>
        this.getAvailableAgents(tenantId, teamId),
      pickAgentForSession: (session, strategy, config, agentIds) =>
        this.pickAgentForSession(session, strategy, config, agentIds),
      runNoAgentFallback: (session) => this.runNoAgentFallback(session),
    });
    this.engine.setRules(ASSIGNMENT_ENGINE_RULES);
  }

  /**
   * Assigns a session to an agent based on the configured strategy.
   * Returns the updated session or null if no assignment could be made.
   */
  async assignSession(
    session: InboxSessionEntity,
  ): Promise<InboxSessionEntity | null> {
    const { strategy, config } = await this.getStrategyWithType(
      session.tenantId,
      session.assignedTeamId || undefined,
    );

    this.logger.log(
      `Assigning session ${session.id} using strategy: ${strategy}`,
    );

    switch (strategy) {
      case "round_robin":
        return this.assignRoundRobin(session);
      case "load_balanced": // Legacy alias
      case "least_active":
        return this.assignLeastActive(session);
      case "least_assigned":
        return this.assignLeastAssigned(session);
      case "hybrid":
        return this.assignHybrid(
          session,
          config?.priority || ["least_active", "least_assigned"],
        );
      case "manual":
        // Manual strategy means agents pick from queue, no auto-assignment
        return null;
      default:
        this.logger.warn(
          `Unknown strategy: ${strategy}, attempting round_robin so handover can still assign`,
        );
        return this.assignRoundRobin(session);
    }
  }

  private static readonly VALID_STRATEGIES: AssignmentStrategy[] = [
    "round_robin",
    "least_active",
    "least_assigned",
    "hybrid",
    "load_balanced",
    "manual",
  ];

  /**
   * Gets the assignment strategy and config for a team or tenant.
   * When team exists, falsy or invalid strategy defaults to round_robin so handovers still get assigned.
   * Public for use by assignment engine rules.
   */
  async getStrategyWithType(
    tenantId: string,
    teamId?: string,
  ): Promise<{ strategy: AssignmentStrategy; config?: any }> {
    // Check team-specific config first
    if (teamId) {
      const team = await this.teamRepo.findOne({ where: { id: teamId } });
      if (team) {
        const raw = team.routingStrategy as AssignmentStrategy;
        const strategy =
          raw && AssignmentService.VALID_STRATEGIES.includes(raw)
            ? raw
            : "round_robin";
        if (raw && raw !== strategy) {
          this.logger.warn(
            `Team ${teamId} had invalid or missing routingStrategy "${raw}", using round_robin`,
          );
        }
        return {
          strategy,
          config: team.routingConfig,
        };
      }
    }

    // Fall back to tenant-level config
    const tenantConfig = await this.configRepo.findOne({
      where: { tenantId, teamId: undefined, enabled: true },
    });

    const tenantStrategy =
      (tenantConfig?.strategy as AssignmentStrategy) || "round_robin";
    const strategy = AssignmentService.VALID_STRATEGIES.includes(tenantStrategy)
      ? tenantStrategy
      : "round_robin";

    return {
      strategy,
      config: undefined,
    };
  }

  /**
   * Gets the assignment strategy (backward compatibility helper)
   */
  private async getStrategy(
    tenantId: string,
    teamId?: string,
  ): Promise<AssignmentStrategy> {
    const { strategy } = await this.getStrategyWithType(tenantId, teamId);
    return strategy;
  }

  /**
   * Helper to fetch metrics for a list of agents
   */
  private async getAgentMetrics(
    agentIds: string[],
    timeWindow?: string,
  ): Promise<Map<string, AgentMetrics>> {
    const metrics = new Map<string, AgentMetrics>();

    let startDate: Date | undefined;
    const now = new Date();

    if (timeWindow) {
      switch (timeWindow) {
        case "shift":
          // Approximate "current shift" as last 12 hours for MVP
          startDate = new Date(now.getTime() - 12 * 60 * 60 * 1000);
          break;
        case "day":
          startDate = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate(),
          );
          break;
        case "week":
          const day = now.getDay();
          const diff = now.getDate() - day + (day == 0 ? -6 : 1); // adjust when day is sunday
          startDate = new Date(now.setDate(diff));
          startDate.setHours(0, 0, 0, 0);
          break;
        case "month":
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case "all_time":
        default:
          startDate = undefined;
      }
    }

    for (const agentId of agentIds) {
      // Initialize
      metrics.set(agentId, { activeCount: 0, totalCount: 0 });

      // Count Active (OPEN/ASSIGNED) - Always real-time
      const active = await this.sessionRepo.count({
        where: {
          assignedAgentId: agentId,
          status: SessionStatus.ASSIGNED,
        },
      });

      // Count Total (Historical)
      const totalQuery = this.sessionRepo
        .createQueryBuilder("session")
        .where("session.assignedAgentId = :agentId", { agentId });

      if (startDate) {
        totalQuery.andWhere("session.assignedAt >= :startDate", { startDate });
      }

      const total = await totalQuery.getCount();

      metrics.set(agentId, { activeCount: active, totalCount: total });
    }
    return metrics;
  }

  /**
   * Helper to fetch details for sorting
   */
  private async getAgentDetails(agentIds: string[]): Promise<AgentDetail[]> {
    // We look in UserEntity via Member/Profile?
    // Since `getAvailableAgents` returns userId, we can query UserEntity.
    // But we don't have UserRepo injected? We have MemberRepo.
    if (agentIds.length === 0) return [];

    const members = await this.memberRepo
      .createQueryBuilder("member")
      .leftJoinAndSelect("member.user", "user")
      .where("member.userId IN (:...ids)", { ids: agentIds })
      .getMany();

    const details: AgentDetail[] = [];
    const seen = new Set<string>();

    // Also check tenant memberships if they are not team members (admins/etc)
    // This is a bit tricky if they aren't in `memberRepo` (team members).
    // For MVP, if they are assignable, they are likely team members or we'll miss their name sort.
    // Fallback to ID for sorting if name not found.

    for (const m of members) {
      if (m.user) {
        details.push({
          id: m.userId,
          name: m.user.name,
          createdAt: m.user.createdAt,
        });
        seen.add(m.userId);
      }
    }

    // If any missing (super admins not in team?), add placeholders
    for (const id of agentIds) {
      if (!seen.has(id)) {
        details.push({ id, name: id, createdAt: new Date(0) });
      }
    }

    return details;
  }

  /**
   * Gets available agents for assignment (team members who are online).
   * Only agents with status ONLINE are assigned messages; offline agents are excluded.
   */
  private async filterToOnlineAgents(agentIds: string[]): Promise<string[]> {
    if (agentIds.length === 0) return [];
    const profiles = await this.agentRepo.find({
      where: { userId: In(agentIds), status: AgentStatus.ONLINE },
      select: ["userId"],
    });
    return profiles.map((p) => p.userId);
  }

  /**
   * Resolves the team id to use for assignment and for persisting on the session (queue stats).
   * - When explicitTeamId is provided: returns it if the team exists and is active for the tenant.
   * - When not provided: returns default team id, or first team with members.
   */
  private async getEffectiveTeamId(
    tenantId: string,
    explicitTeamId?: string,
  ): Promise<string | null> {
    if (explicitTeamId) {
      const team = await this.teamRepo.findOne({
        where: { id: explicitTeamId, tenantId, isActive: true },
        select: ["id"],
      });
      return team?.id ?? null;
    }
    const defaultTeam = await this.teamRepo.findOne({
      where: { tenantId, isDefault: true, isActive: true },
      select: ["id"],
    });
    if (defaultTeam) {
      const memberCount = await this.memberRepo.count({
        where: { teamId: defaultTeam.id, isActive: true },
      });
      if (memberCount > 0) return defaultTeam.id;
    }
    const teams = await this.teamRepo.find({
      where: { tenantId, isActive: true },
      select: ["id"],
      order: { isDefault: "DESC", createdAt: "ASC" },
    });
    for (const team of teams) {
      const memberCount = await this.memberRepo.count({
        where: { teamId: team.id, isActive: true },
      });
      if (memberCount > 0) return team.id;
    }
    return null;
  }

  /**
   * Gets available agents for assignment (online and under max load).
   * - When teamId is provided: use that team's members and its routingConfig.maxLoad.
   * - When no teamId: use default team with members, else first team with members.
   * - Only returns agents who are online (agent_profiles.status = ONLINE).
   * - If team has routingConfig.maxLoad set, excludes agents with current assigned chat count >= maxLoad.
   * Public for use by assignment engine rules.
   */
  async getAvailableAgents(
    tenantId: string,
    teamId?: string,
  ): Promise<string[]> {
    let ids: string[] = [];
    let effectiveTeam: TeamEntity | null = null;

    if (teamId) {
      const team = await this.teamRepo.findOne({
        where: { id: teamId },
        select: ["id", "routingConfig"],
      });
      effectiveTeam = team;
      if (team) {
        const teamMembers = await this.memberRepo.find({
          where: { teamId, isActive: true },
          select: ["userId"],
        });
        ids = teamMembers.map((m) => m.userId);
        if (ids.length > 0) {
          this.logger.log(`Found ${ids.length} agents in Team ${teamId}`);
        }
      }
    } else {
      const defaultTeam = await this.teamRepo.findOne({
        where: { tenantId, isDefault: true, isActive: true },
        select: ["id", "routingConfig"],
      });
      if (defaultTeam) {
        effectiveTeam = defaultTeam;
        const members = await this.memberRepo.find({
          where: { teamId: defaultTeam.id, isActive: true },
          select: ["userId"],
        });
        ids = members.map((m) => m.userId);
        if (ids.length > 0) {
          this.logger.log(
            `Using default team ${defaultTeam.id} (${ids.length} members)`,
          );
        }
      }
      if (ids.length === 0) {
        const teams = await this.teamRepo.find({
          where: { tenantId, isActive: true },
          select: ["id", "routingConfig"],
          order: { isDefault: "DESC", createdAt: "ASC" },
        });
        for (const team of teams) {
          const teamMembers = await this.memberRepo.find({
            where: { teamId: team.id, isActive: true },
            select: ["userId"],
          });
          ids = teamMembers.map((m) => m.userId);
          if (ids.length > 0) {
            effectiveTeam = team;
            this.logger.log(
              `Using first team with members: ${team.id} (${ids.length} members)`,
            );
            break;
          }
        }
      }
    }

    if (ids.length === 0) {
      this.logger.warn(
        "No teams with members found for tenant; session left unassigned",
      );
      return [];
    }

    let onlineIds = await this.filterToOnlineAgents(ids);
    if (onlineIds.length < ids.length) {
      this.logger.log(
        `${onlineIds.length} of ${ids.length} team members are online and eligible for assignment`,
      );
    }

    const maxLoad =
      effectiveTeam?.routingConfig != null &&
      typeof effectiveTeam.routingConfig.maxLoad === "number" &&
      effectiveTeam.routingConfig.maxLoad > 0
        ? effectiveTeam.routingConfig.maxLoad
        : undefined;
    if (maxLoad != null && onlineIds.length > 0) {
      const metrics = await this.getAgentMetrics(onlineIds);
      const underLoad = onlineIds.filter(
        (id) => (metrics.get(id)?.activeCount ?? 0) < maxLoad,
      );
      if (underLoad.length < onlineIds.length) {
        this.logger.log(
          `${underLoad.length} of ${onlineIds.length} online agents are under max load (${maxLoad})`,
        );
      }
      onlineIds = underLoad;
    }

    if (onlineIds.length === 0) {
      this.logger.warn(
        "No online agents in team; session left unassigned. Agents must be online (and under max load if set) to receive assignments.",
      );
    }
    return onlineIds;
  }

  /**
   * Round-robin assignment: assigns to agents in a circular order.
   */
  private async assignRoundRobin(
    session: InboxSessionEntity,
  ): Promise<InboxSessionEntity | null> {
    const contextKey = session.assignedTeamId || session.tenantId;
    const { config } = await this.getStrategyWithType(
      session.tenantId,
      session.assignedTeamId,
    );

    const agentIds = await this.getAvailableAgents(
      session.tenantId,
      session.assignedTeamId || undefined,
    );

    if (agentIds.length === 0) {
      this.logger.warn("No available agents for round-robin assignment");
      return null;
    }

    // SORTING Logic
    // Default: 'name' (Alphabetical) as per user request? User said "name, order of date added".
    // Default config should probably be 'name'.
    const sortBy = config?.sortBy || "name"; // 'name' | 'created_at' | 'random'

    if (sortBy === "random") {
      // shuffle
      // To maintain "Round Robin" ring with random sort, the ring changes every time?
      // No, Round Robin implies a STABLE ring.
      // "Random" usually means "Random Assignment", not RR.
      // If "Round Robin based on Random", it means we randomize the order ONCE? No.
      // Let's assume 'random' effectively means Random Assignment.
      // But for RR consistency, we should stick to a stable field.
      // If sorting by ID, it's stable.
      agentIds.sort();
    } else {
      const details = await this.getAgentDetails(agentIds);
      agentIds.sort((a, b) => {
        const detailA = details.find((d) => d.id === a);
        const detailB = details.find((d) => d.id === b);
        if (!detailA || !detailB) return 0;

        if (sortBy === "created_at") {
          return detailA.createdAt.getTime() - detailB.createdAt.getTime();
        }
        // Default name
        return detailA.name.localeCompare(detailB.name);
      });
    }

    const index = await this.rrContext.getNextIndex(
      contextKey,
      agentIds.length,
    );
    const selectedAgentId = agentIds[index];

    session.assignedAgentId = selectedAgentId;
    session.status = SessionStatus.ASSIGNED;
    session.assignedAt = new Date();

    this.logger.log(
      `Assigning session ${session.id} to agent ${selectedAgentId} (round-robin index ${index})`,
    );
    try {
      const saved = await this.sessionRepo.save(session);
      this.logger.log(
        `Session ${session.id} saved with assignedAgentId=${saved.assignedAgentId}, status=${saved.status}`,
      );
      return saved;
    } catch (err: unknown) {
      this.logger.error(
        `Failed to save session ${session.id} assignment: ${err instanceof Error ? err.message : String(err)}`,
      );
      throw err;
    }
  }

  /**
   * Least Active assignment: assigns to the agent with the fewest open chats.
   */
  private async assignLeastActive(
    session: InboxSessionEntity,
  ): Promise<InboxSessionEntity | null> {
    const agentIds = await this.getAvailableAgents(
      session.tenantId,
      session.assignedTeamId || undefined,
    );

    if (agentIds.length === 0) return null;

    const metrics = await this.getAgentMetrics(agentIds);

    // Sort by active count ASC, then Round Robin (index) -> actually simple sort is active ASC
    // For tie-breaking to Round Robin, we need to defer to RR logic if min values are equal.

    // Find min active count
    let minActive = Infinity;
    metrics.forEach((m) => {
      if (m.activeCount < minActive) minActive = m.activeCount;
    });

    // Get candidates with minActive
    const candidates = agentIds.filter(
      (id) => metrics.get(id)?.activeCount === minActive,
    );

    // Pick one from candidates using Round Robin
    return this.pickRoundRobinFromCandidates(session, candidates);
  }

  /**
   * Least Assigned assignment: assigns to the agent with fewest total assignments.
   */
  private async assignLeastAssigned(
    session: InboxSessionEntity,
  ): Promise<InboxSessionEntity | null> {
    const { config } = await this.getStrategyWithType(
      session.tenantId,
      session.assignedTeamId,
    );
    const timeWindow = config?.timeWindow || "all_time";

    const agentIds = await this.getAvailableAgents(
      session.tenantId,
      session.assignedTeamId || undefined,
    );

    if (agentIds.length === 0) return null;

    const metrics = await this.getAgentMetrics(agentIds, timeWindow);

    let minTotal = Infinity;
    metrics.forEach((m) => {
      if (m.totalCount < minTotal) minTotal = m.totalCount;
    });

    const candidates = agentIds.filter(
      (id) => metrics.get(id)?.totalCount === minTotal,
    );

    return this.pickRoundRobinFromCandidates(session, candidates);
  }

  /**
   * Hybrid assignment: Sorts by User Priorities.
   * Fallback to Round Robin on ties.
   */
  private async assignHybrid(
    session: InboxSessionEntity,
    priorities: string[],
  ): Promise<InboxSessionEntity | null> {
    const agentIds = await this.getAvailableAgents(
      session.tenantId,
      session.assignedTeamId || undefined,
    );

    if (agentIds.length === 0) return null;

    const metrics = await this.getAgentMetrics(agentIds);

    // Sort agents
    agentIds.sort((a, b) => {
      const metricA = metrics.get(a)!;
      const metricB = metrics.get(b)!;

      for (const priority of priorities) {
        if (priority === "least_active") {
          if (metricA.activeCount !== metricB.activeCount)
            return metricA.activeCount - metricB.activeCount;
        }
        if (priority === "least_assigned") {
          if (metricA.totalCount !== metricB.totalCount)
            return metricA.totalCount - metricB.totalCount;
        }
      }
      return 0; // Tie
    });

    // Find all top agents (first one + any ties)
    const bestAgent = agentIds[0];
    const metricBest = metrics.get(bestAgent)!;

    // Filter strictly for ties with the best agent
    const candidates = agentIds.filter((id) => {
      const m = metrics.get(id)!;
      // Must match match on ALL priorities
      for (const priority of priorities) {
        if (
          priority === "least_active" &&
          m.activeCount !== metricBest.activeCount
        )
          return false;
        if (
          priority === "least_assigned" &&
          m.totalCount !== metricBest.totalCount
        )
          return false;
      }
      return true;
    });

    return this.pickRoundRobinFromCandidates(session, candidates);
  }

  /**
   * Helper to perform Round Robin selection on a filtered subset of agents.
   * Used for tie-breaking.
   */
  private async pickRoundRobinFromCandidates(
    session: InboxSessionEntity,
    candidates: string[],
  ): Promise<InboxSessionEntity> {
    // Sort candidates by ID for deterministic ring
    candidates.sort();

    const contextKey = session.assignedTeamId || session.tenantId;
    const index = await this.rrContext.getNextIndex(
      contextKey,
      candidates.length,
    );
    const selectedId = candidates[index];

    session.assignedAgentId = selectedId;
    session.status = SessionStatus.ASSIGNED;
    session.assignedAt = new Date();

    return this.sessionRepo.save(session);
  }

  /**
   * Pick next agent ID from candidates using round-robin (updates context; does not save).
   * Used by pickAgentForSession and by strategy implementations for tie-breaking.
   */
  private async pickNextRoundRobinId(
    contextKey: string,
    candidates: string[],
  ): Promise<string> {
    if (candidates.length === 0)
      throw new Error("pickNextRoundRobinId: empty candidates");
    const sorted = [...candidates].sort();
    const index = await this.rrContext.getNextIndex(contextKey, sorted.length);
    return sorted[index];
  }

  /**
   * Pick one agent by strategy from the given agent list (no DB save).
   * Public for use by assignment engine SelectorRule.
   */
  async pickAgentForSession(
    session: InboxSessionEntity,
    strategy: string,
    config: Record<string, unknown> | undefined,
    agentIds: string[],
  ): Promise<string | null> {
    if (agentIds.length === 0) return null;
    const contextKey = session.assignedTeamId || session.tenantId;

    switch (strategy) {
      case "round_robin": {
        const sortBy = (config?.sortBy as string) || "name";
        let sorted = agentIds;
        if (sortBy === "random") {
          sorted = [...agentIds].sort();
        } else {
          const details = await this.getAgentDetails(agentIds);
          sorted = [...agentIds].sort((a, b) => {
            const detailA = details.find((d) => d.id === a);
            const detailB = details.find((d) => d.id === b);
            if (!detailA || !detailB) return 0;
            if (sortBy === "created_at")
              return detailA.createdAt.getTime() - detailB.createdAt.getTime();
            return detailA.name.localeCompare(detailB.name);
          });
        }
        return await this.pickNextRoundRobinId(contextKey, sorted);
      }
      case "load_balanced":
      case "least_active": {
        const metrics = await this.getAgentMetrics(agentIds);
        let minActive = Infinity;
        metrics.forEach((m) => {
          if (m.activeCount < minActive) minActive = m.activeCount;
        });
        const candidates = agentIds.filter(
          (id) => metrics.get(id)?.activeCount === minActive,
        );
        return await this.pickNextRoundRobinId(contextKey, candidates);
      }
      case "least_assigned": {
        const timeWindow = (config?.timeWindow as string) || "all_time";
        const metrics = await this.getAgentMetrics(agentIds, timeWindow);
        let minTotal = Infinity;
        metrics.forEach((m) => {
          if (m.totalCount < minTotal) minTotal = m.totalCount;
        });
        const candidates = agentIds.filter(
          (id) => metrics.get(id)?.totalCount === minTotal,
        );
        return await this.pickNextRoundRobinId(contextKey, candidates);
      }
      case "hybrid": {
        const priorities = (config?.priority as string[]) || [
          "least_active",
          "least_assigned",
        ];
        const metrics = await this.getAgentMetrics(agentIds);
        const sorted = [...agentIds].sort((a, b) => {
          const metricA = metrics.get(a)!;
          const metricB = metrics.get(b)!;
          for (const priority of priorities) {
            if (priority === "least_active") {
              if (metricA.activeCount !== metricB.activeCount)
                return metricA.activeCount - metricB.activeCount;
            }
            if (priority === "least_assigned") {
              if (metricA.totalCount !== metricB.totalCount)
                return metricA.totalCount - metricB.totalCount;
            }
          }
          return 0;
        });
        const bestAgent = sorted[0];
        const metricBest = metrics.get(bestAgent)!;
        const candidates = sorted.filter((id) => {
          const m = metrics.get(id)!;
          for (const priority of priorities) {
            if (
              priority === "least_active" &&
              m.activeCount !== metricBest.activeCount
            )
              return false;
            if (
              priority === "least_assigned" &&
              m.totalCount !== metricBest.totalCount
            )
              return false;
          }
          return true;
        });
        return await this.pickNextRoundRobinId(contextKey, candidates);
      }
      default:
        return await this.pickNextRoundRobinId(
          contextKey,
          [...agentIds].sort(),
        );
    }
  }

  /**
   * Run no-agent fallback (send message and record in inbox if configured).
   * Public for use by assignment engine rules.
   */
  async runNoAgentFallback(session: InboxSessionEntity): Promise<void> {
    const config = await this.configRepo.findOne({
      where: { tenantId: session.tenantId, teamId: undefined, enabled: true },
    });
    const waterfall = config?.settings?.waterfall;
    const noAgentAction = waterfall?.noAgentAction || "queue";
    if (noAgentAction !== "reply") return;

    const messageText =
      waterfall?.noAgentMessage ||
      "All of our agents are currently busy. We will get back to you shortly.";
    try {
      const account = (session.context as Record<string, unknown>)?.account as
        | string
        | undefined;
      await this.whatsappService.sendMessage(
        session.tenantId,
        session.contactId,
        messageText,
        { account },
      );
      await this.inboxService.addMessage({
        tenantId: session.tenantId,
        sessionId: session.id,
        contactId: session.contactId,
        direction: MessageDirection.OUTBOUND,
        content: messageText,
        senderId: undefined,
      });
      this.logger.log(`Sent no-agent fallback message to ${session.contactId}`);
    } catch (e) {
      this.logger.error("Failed to send no-agent fallback message", e);
    }
  }

  /**
   * Requests assignment for a session (used when bot hands off to agent).
   * If auto-assignment is possible, assigns immediately.
   * Otherwise, leaves in unassigned queue.
   * §5.1 Verified engine-only: no legacy path; schedule/contact/assign/no-agent are handled by rules.
   */
  async requestAssignment(
    sessionId: string,
    teamId?: string,
    context?: Record<string, unknown>,
  ): Promise<InboxSessionEntity> {
    const session = await this.sessionRepo.findOneOrFail({
      where: { id: sessionId },
    });

    // Resolve effective team so queue stats (and engine) have a team; use default/first when handover omits teamId
    // treat empty string as undefined/null so we fall back to default team
    const effectiveTeamId =
      (teamId && teamId.trim().length > 0 ? teamId : undefined) ??
      (await this.getEffectiveTeamId(session.tenantId, teamId));

    if (effectiveTeamId) {
      session.assignedTeamId = effectiveTeamId;
    }
    if (context) {
      session.context = { ...session.context, ...context };
    }

    await this.sessionRepo.save(session);

    // Handover is 100% engine-driven: no legacy path (schedule/contact/assignSession/no-agent
    // are handled inside rules). See assignment_engine_phase5_design.md §2.
    const result = await this.engine.run({
      session,
      source: "handover",
    });
    if (result.outcome === "assign") {
      session.assignedAgentId = result.agentId;
      session.status = SessionStatus.ASSIGNED;
      session.assignedAt = new Date();
      await this.sessionRepo.save(session);
      return session;
    }
    if (result.outcome === "skip") return session;
    if (result.outcome === "error") {
      this.logger.warn(`Assignment engine error: ${result.message}`);
      return session; // No assign, no partial save (4.3)
    }
    // outcome === 'stop': schedule closed, manual strategy, or no agents (fallback already run by rules)
    return session;
  }

  /**
   * Assigns queued (unassigned) sessions to available agents.
   * Called when an agent goes online or via "Assign queue" action.
   * Uses the same assignment engine as handover (source: queue), so schedule and no-agent
   * rules apply: no assign when team is closed; no-agent fallback runs when no agents.
   */
  async assignQueuedSessionsToAvailableAgents(
    tenantId: string,
    options?: { teamId?: string; limit?: number },
  ): Promise<{ assigned: number }> {
    const limit = options?.limit ?? 50;
    const sessions = await this.inboxService.getUnassignedSessions(
      tenantId,
      options?.teamId,
    );
    let assigned = 0;
    for (let i = 0; i < Math.min(sessions.length, limit); i++) {
      const session = sessions[i];
      // Sessions from processor (webhook_sync) have assignedTeamId null; set effective team so engine and DB are consistent
      if (!session.assignedTeamId) {
        const effectiveTeamId =
          options?.teamId ?? (await this.getEffectiveTeamId(tenantId));
        if (effectiveTeamId) session.assignedTeamId = effectiveTeamId;
      }
      const result = await this.engine.run({
        session,
        source: "queue",
      });
      if (result.outcome === "assign") {
        session.assignedAgentId = result.agentId;
        session.status = SessionStatus.ASSIGNED;
        session.assignedAt = new Date();
        await this.sessionRepo.save(session);
        assigned++;
      }
      if (result.outcome === "error") {
        this.logger.warn(
          `Assignment engine error for session ${session.id}: ${result.message}`,
        );
        // No assign, no partial save (4.3)
      }
    }
    if (assigned > 0) {
      this.logger.log(
        `Assigned ${assigned} queued session(s) to available agents (tenant=${tenantId}${options?.teamId ? `, team=${options.teamId}` : ""})`,
      );
    }
    return { assigned };
  }

  /**
   * Assign queued sessions to specific agents (manual assignment).
   * Each entry assigns up to `count` unassigned sessions to that agent.
   * Uses agent's first active team for assignedTeamId.
   */
  async assignQueuedSessionsToAgents(
    tenantId: string,
    assignments: Array<{ agentId: string; count: number }>,
  ): Promise<{ assigned: number }> {
    const limit = 50;
    const sessions = await this.inboxService.getUnassignedSessions(
      tenantId,
      undefined,
    );
    let assigned = 0;
    let sessionIndex = 0;

    for (const { agentId, count } of assignments) {
      if (count <= 0 || sessionIndex >= sessions.length) continue;
      const member = await this.memberRepo.findOne({
        where: { userId: agentId, isActive: true },
        select: ["teamId"],
      });
      const agentTeamId = member?.teamId ?? null;

      for (let i = 0; i < count && sessionIndex < sessions.length; i++) {
        const session = sessions[sessionIndex];
        sessionIndex++;
        try {
          await this.inboxService.assignSession(
            session.id,
            agentId,
            agentTeamId,
          );
          assigned++;
        } catch (err) {
          this.logger.warn(
            `Manual assign session ${session.id} to ${agentId} failed: ${(err as Error).message}`,
          );
        }
      }
    }

    if (assigned > 0) {
      this.logger.log(
        `Manually assigned ${assigned} queued session(s) (tenant=${tenantId})`,
      );
    }
    return { assigned };
  }

  /**
   * Assign queued sessions to one or more teams; engine picks the agent within each team.
   * Sessions are distributed round-robin across the given teamIds.
   */
  async assignQueuedSessionsToTeams(
    tenantId: string,
    teamIds: string[],
  ): Promise<{ assigned: number }> {
    if (teamIds.length === 0) return { assigned: 0 };
    const limit = 50;
    const sessions = await this.inboxService.getUnassignedSessions(
      tenantId,
      undefined,
    );
    let assigned = 0;
    let teamIndex = 0;

    for (let i = 0; i < Math.min(sessions.length, limit); i++) {
      const session = sessions[i];
      const teamId = teamIds[teamIndex % teamIds.length];
      teamIndex++;
      session.assignedTeamId = teamId;
      const result = await this.engine.run({
        session,
        source: "queue",
      });
      if (result.outcome === "assign") {
        session.assignedAgentId = result.agentId;
        session.status = SessionStatus.ASSIGNED;
        session.assignedAt = new Date();
        await this.sessionRepo.save(session);
        assigned++;
      }
    }

    if (assigned > 0) {
      this.logger.log(
        `Assigned ${assigned} queued session(s) to teams (tenant=${tenantId}, teamIds=${teamIds.join(",")})`,
      );
    }
    return { assigned };
  }

  /**
   * Teams that have an active shift and at least one active member (for queue assignment UI).
   */
  async getTeamsAvailableForQueue(
    tenantId: string,
  ): Promise<Array<{ teamId: string; name: string; memberCount: number }>> {
    const teams = await this.teamRepo.find({
      where: { tenantId, isActive: true },
      select: ["id", "name"],
    });
    const result: Array<{
      teamId: string;
      name: string;
      memberCount: number;
    }> = [];

    for (const team of teams) {
      const [memberCount, schedule] = await Promise.all([
        this.memberRepo.count({
          where: { teamId: team.id, isActive: true },
        }),
        this.checkScheduleAvailability(team.id),
      ]);
      if (memberCount > 0 && schedule.isOpen) {
        result.push({
          teamId: team.id,
          name: team.name,
          memberCount,
        });
      }
    }

    return result;
  }

  /**
   * Checks if the team is currently available based on its schedule.
   * Shift times are interpreted in the team's timezone (IANA, e.g. Africa/Nairobi).
   * If timezone is missing or invalid, we treat as closed to avoid assigning outside intended hours.
   */
  async checkScheduleAvailability(
    teamId: string,
  ): Promise<{ isOpen: boolean; nextOpen?: Date; message?: string }> {
    const team = await this.teamRepo.findOne({ where: { id: teamId } });
    if (!team || !team.schedule || !team.schedule.enabled) {
      return { isOpen: true }; // Default to open if no schedule
    }

    const { timezone, days, outOfOfficeMessage: teamOoo } = team.schedule;
    const defaultOoo = await this.systemMessages.get(
      team.tenantId,
      "outOfOfficeMessage",
    );
    const outOfOfficeMessage = teamOoo ?? defaultOoo ?? "We are currently closed.";

    if (!timezone || typeof timezone !== "string" || timezone.trim() === "") {
      this.logger.warn(
        `Schedule check for team ${teamId}: timezone missing; treating as closed`,
      );
      return {
        isOpen: false,
        message: outOfOfficeMessage,
      };
    }

    const now = new Date();
    // Helper to get day/time in target zone; throws if timezone is invalid
    const getParts = (d: Date) => {
      const options: Intl.DateTimeFormatOptions = {
        timeZone: timezone.trim(),
        weekday: "long",
        hour: "numeric",
        minute: "numeric",
        hour12: false,
      };
      const formatter = new Intl.DateTimeFormat("en-US", options);
      const parts = formatter.formatToParts(d);
      const day =
        parts.find((p) => p.type === "weekday")?.value.toLowerCase() || "";
      const h = parseInt(parts.find((p) => p.type === "hour")?.value || "0");
      const m = parseInt(parts.find((p) => p.type === "minute")?.value || "0");
      return { day, h, m, mins: h * 60 + m };
    };

    let current: { day: string; h: number; m: number; mins: number };
    try {
      current = getParts(now);
    } catch (err) {
      this.logger.warn(
        `Schedule check for team ${teamId}: invalid timezone "${timezone}" (${(err as Error).message}); treating as closed`,
      );
      return {
        isOpen: false,
        message: outOfOfficeMessage,
      };
    }

    // Check today's shifts
    const dayShifts = days[current.day] || [];
    for (const shift of dayShifts) {
      const [startH, startM] = shift.start.split(":").map(Number);
      const [endH, endM] = shift.end.split(":").map(Number);
      const startMins = startH * 60 + startM;
      const endMins = endH * 60 + endM;

      if (current.mins >= startMins && current.mins < endMins) {
        return { isOpen: true };
      }
    }

    // Find next open slot
    // Look up to 7 days ahead
    for (let i = 0; i < 7; i++) {
      // Construct date for "now + i days"
      // Note: naive addition, simplified for MVP
      const d = new Date(now.getTime() + i * 24 * 60 * 60 * 1000);
      const p = getParts(d);
      const shifts = days[p.day] || [];

      for (const shift of shifts) {
        const [startH, startM] = shift.start.split(":").map(Number);
        const startMins = startH * 60 + startM;

        // If it's today (i=0), shift must be in future
        if (i === 0 && startMins <= current.mins) continue;

        // Found next shift
        // Calculate minutes until that shift
        // (i * 24h) + (shiftStartMins - currentMins)
        // Only works correctly if timezone doesn't change offset in these days (mostly fine)
        const minutesUntil = i * 24 * 60 + (startMins - current.mins);
        const nextOpenDate = new Date(now.getTime() + minutesUntil * 60 * 1000);

        return {
          isOpen: false,
          nextOpen: nextOpenDate,
          message: outOfOfficeMessage,
        };
      }
    }

    return { isOpen: false, message: outOfOfficeMessage };
  }
}
