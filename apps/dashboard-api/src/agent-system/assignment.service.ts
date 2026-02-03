/**
 * =============================================================================
 * ASSIGNMENT SERVICE
 * =============================================================================
 *
 * Handles the logic for assigning chats to agents.
 * Supports multiple strategies: Round Robin, Load Balanced, Manual/Queue.
 */

import { Injectable, Logger } from "@nestjs/common";
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
import { InboxService } from "./inbox.service";

export type AssignmentStrategy =
  | "round_robin"
  | "least_active"
  | "least_assigned"
  | "hybrid"
  | "load_balanced"
  | "manual";

/**
 * Context for the round-robin strategy.
 * Tracks the last assigned agent index per team/tenant.
 */
interface RoundRobinContext {
  [teamOrTenantId: string]: number;
}

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
  private roundRobinContext: RoundRobinContext = {};

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
  ) {}

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
   */
  private async getStrategyWithType(
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
   * Gets available agents for assignment.
   * - When teamId is provided: use that team's members.
   * - When no teamId: use default team with members, else first team with members; if no teams or none have members, return [] (do not assign).
   * - Only returns agents who are online (agent_profiles.status = ONLINE).
   */
  private async getAvailableAgents(
    tenantId: string,
    teamId?: string,
  ): Promise<string[]> {
    let ids: string[] = [];

    if (teamId) {
      const teamMembers = await this.memberRepo.find({
        where: { teamId, isActive: true },
        select: ["userId"],
      });
      ids = teamMembers.map((m) => m.userId);
      if (ids.length > 0) {
        this.logger.log(`Found ${ids.length} agents in Team ${teamId}`);
      }
    } else {
      const defaultTeam = await this.teamRepo.findOne({
        where: { tenantId, isDefault: true, isActive: true },
        select: ["id"],
      });
      if (defaultTeam) {
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
          select: ["id"],
          order: { isDefault: "DESC", createdAt: "ASC" },
        });
        for (const team of teams) {
          const teamMembers = await this.memberRepo.find({
            where: { teamId: team.id, isActive: true },
            select: ["userId"],
          });
          ids = teamMembers.map((m) => m.userId);
          if (ids.length > 0) {
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

    const onlineIds = await this.filterToOnlineAgents(ids);
    if (onlineIds.length < ids.length) {
      this.logger.log(
        `${onlineIds.length} of ${ids.length} team members are online and eligible for assignment`,
      );
    }
    if (onlineIds.length === 0) {
      this.logger.warn(
        "No online agents in team; session left unassigned. Agents must be online to receive assignments.",
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

    const lastIndex = this.roundRobinContext[contextKey] ?? -1;
    const nextIndex = (lastIndex + 1) % agentIds.length;
    this.roundRobinContext[contextKey] = nextIndex;

    const selectedAgentId = agentIds[nextIndex];

    session.assignedAgentId = selectedAgentId;
    session.status = SessionStatus.ASSIGNED;
    session.assignedAt = new Date();

    this.logger.log(
      `Assigning session ${session.id} to agent ${selectedAgentId} (round-robin index ${nextIndex})`,
    );
    try {
      const saved = await this.sessionRepo.save(session);
      this.logger.log(
        `Session ${session.id} saved with assignedAgentId=${saved.assignedAgentId}, status=${saved.status}`,
      );
      return saved;
    } catch (err: any) {
      this.logger.error(
        `Failed to save session ${session.id} assignment: ${err?.message ?? err}`,
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
    const lastIndex = this.roundRobinContext[contextKey] ?? -1;

    // We need to pick the "next" agent relative to the entire pool context,
    // OR just round robin within this candidate list?
    // "When equal, default to round robin".
    // If we just RR within candidates, it works.

    // Simple local RR for candidates
    // To prevent "starvation" or sticky assignment if candidates are always the same 2 people,
    // we need a persistent index for this group?
    // Or just rely on random?
    // User asked for "Round Robin".
    // Ideally we maintain the global pointer.
    // But candidates might change.
    // Let's just create a hash or increment a counter for the team to rotate through ties.

    const counter = this.roundRobinContext[contextKey] ?? 0;
    const selectedId = candidates[counter % candidates.length];

    // Increment global counter
    this.roundRobinContext[contextKey] = counter + 1;

    session.assignedAgentId = selectedId;
    session.status = SessionStatus.ASSIGNED;
    session.assignedAt = new Date();

    return this.sessionRepo.save(session);
  }

  /**
   * Requests assignment for a session (used when bot hands off to agent).
   * If auto-assignment is possible, assigns immediately.
   * Otherwise, leaves in unassigned queue.
   */
  async requestAssignment(
    sessionId: string,
    teamId?: string,
    context?: Record<string, unknown>,
  ): Promise<InboxSessionEntity> {
    const session = await this.sessionRepo.findOneOrFail({
      where: { id: sessionId },
    });

    // Update session with team assignment and context
    if (teamId) {
      session.assignedTeamId = teamId;
    }
    if (context) {
      session.context = { ...session.context, ...context };
    }

    await this.sessionRepo.save(session);

    // CHECK SCHEDULE AVAILABILITY
    if (teamId) {
      const { isOpen, nextOpen, message } =
        await this.checkScheduleAvailability(teamId);
      if (!isOpen) {
        this.logger.log(`Team ${teamId} is closed. Next open: ${nextOpen}`);

        let action = "queue";
        if (nextOpen) {
          const diffMs = nextOpen.getTime() - Date.now();
          const diffHours = diffMs / (1000 * 60 * 60);
          if (diffHours > 24) {
            action = "ooo";
          }
        } else {
          action = "ooo"; // No known next shift
        }

        if (action === "ooo") {
          const oooMsg = message || "We are currently closed.";
          try {
            await this.whatsappService.sendMessage(
              session.tenantId,
              session.contactId,
              oooMsg,
            );
            await this.inboxService.addMessage({
              tenantId: session.tenantId,
              sessionId: session.id,
              contactId: session.contactId,
              direction: MessageDirection.OUTBOUND,
              content: oooMsg,
              senderId: undefined, // system
            });
          } catch (e) {
            this.logger.error("Failed to send OOO message", e);
          }
          return session; // Stop assignment
        }

        // If 'queue', we just return the session without assigning.
        return session;
      }
    }

    // Attempt auto-assignment
    const assigned = await this.assignSession(session);

    if (assigned) {
      return assigned;
    }

    // Log why session was left unassigned (helps debug prod handovers)
    const { strategy } = await this.getStrategyWithType(
      session.tenantId,
      session.assignedTeamId || undefined,
    );
    const agentIds = await this.getAvailableAgents(
      session.tenantId,
      session.assignedTeamId || undefined,
    );
    this.logger.warn(
      `Handover session ${session.id} left unassigned. Strategy=${strategy}, availableAgents=${agentIds.length} (tenantId=${session.tenantId}, teamId=${session.assignedTeamId ?? "none"}). Check: strategy is "manual" or no team has members.`,
    );

    // --- NO AGENT AVAILABLE HANDLING ---

    // Check Schedule first (if no agent was found immediately, or strictly enforce it?)
    // Actually, we should check schedule BEFORE assignment attempts if we want to blocking OOO.
    // But typically "Assignment" involves checking agents. If schedule says "Closed", we shouldn't even look for agents.
    // Let's refactor to check schedule at the start of requestAssignment?
    // User requirement: "on days where the team does now work we dont assign messages"
    // So YES, check schedule first.

    // Move logic up.

    // 1. Fetch Config
    const config = await this.configRepo.findOne({
      where: { tenantId: session.tenantId, teamId: undefined, enabled: true },
    });

    const waterfall = config?.settings?.waterfall;
    const noAgentAction = waterfall?.noAgentAction || "queue"; // 'queue' | 'reply'

    if (noAgentAction === "reply") {
      const messageText =
        waterfall?.noAgentMessage ||
        "All of our agents are currently busy. We will get back to you shortly.";

      try {
        // Send WA message
        await this.whatsappService.sendMessage(
          session.tenantId,
          session.contactId,
          messageText,
        );

        // Record in Inbox
        await this.inboxService.addMessage({
          tenantId: session.tenantId,
          sessionId: session.id,
          contactId: session.contactId,
          direction: MessageDirection.OUTBOUND,
          content: messageText,
          senderId: undefined, // system
        });
        this.logger.log(
          `Sent no-agent fallback message to ${session.contactId}`,
        );
      } catch (e) {
        this.logger.error("Failed to send no-agent fallback message", e);
      }
    }

    return session;
  }

  /**
   * Checks if the team is currently available based on its schedule.
   */
  async checkScheduleAvailability(
    teamId: string,
  ): Promise<{ isOpen: boolean; nextOpen?: Date; message?: string }> {
    const team = await this.teamRepo.findOne({ where: { id: teamId } });
    if (!team || !team.schedule || !team.schedule.enabled) {
      return { isOpen: true }; // Default to open if no schedule
    }

    const { timezone, days, outOfOfficeMessage } = team.schedule;

    const now = new Date();
    // Helper to get day/time in target zone
    const getParts = (d: Date) => {
      const options: Intl.DateTimeFormatOptions = {
        timeZone: timezone,
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

    const current = getParts(now);

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
