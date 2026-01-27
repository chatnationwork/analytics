/**
 * =============================================================================
 * ASSIGNMENT SERVICE
 * =============================================================================
 *
 * Handles the logic for assigning chats to agents.
 * Supports multiple strategies: Round Robin, Load Balanced, Manual/Queue.
 */

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  InboxSessionEntity,
  SessionStatus,
  TeamEntity,
  TeamMemberEntity,
  AgentProfileEntity,
  AgentStatus,
  AssignmentConfigEntity,
} from '@lib/database';

export type AssignmentStrategy = 'round_robin' | 'load_balanced' | 'manual';

/**
 * Context for the round-robin strategy.
 * Tracks the last assigned agent index per team/tenant.
 */
interface RoundRobinContext {
  [teamOrTenantId: string]: number;
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
  ) {}

  /**
   * Assigns a session to an agent based on the configured strategy.
   * Returns the updated session or null if no assignment could be made.
   */
  async assignSession(
    session: InboxSessionEntity,
  ): Promise<InboxSessionEntity | null> {
    const strategy = await this.getStrategy(
      session.tenantId,
      session.assignedTeamId || undefined,
    );

    this.logger.log(
      `Assigning session ${session.id} using strategy: ${strategy}`,
    );

    switch (strategy) {
      case 'round_robin':
        return this.assignRoundRobin(session);
      case 'load_balanced':
        return this.assignLoadBalanced(session);
      case 'manual':
        // Manual strategy means agents pick from queue, no auto-assignment
        return null;
      default:
        this.logger.warn(`Unknown strategy: ${strategy}, defaulting to manual`);
        return null;
    }
  }

  /**
   * Gets the assignment strategy for a team or tenant.
   */
  private async getStrategy(
    tenantId: string,
    teamId?: string,
  ): Promise<AssignmentStrategy> {
    // Check team-specific config first
    if (teamId) {
      const teamConfig = await this.configRepo.findOne({
        where: { tenantId, teamId, enabled: true },
      });
      if (teamConfig) {
        return teamConfig.strategy as AssignmentStrategy;
      }

      // Check team's routing strategy
      const team = await this.teamRepo.findOne({ where: { id: teamId } });
      if (team) {
        return team.routingStrategy as AssignmentStrategy;
      }
    }

    // Fall back to tenant-level config
    const tenantConfig = await this.configRepo.findOne({
      where: { tenantId, teamId: undefined, enabled: true },
    });

    return (tenantConfig?.strategy as AssignmentStrategy) || 'round_robin';
  }

  /**
   * Gets available agents for assignment.
   * An agent is available if they are online and not at max capacity.
   */
  private async getAvailableAgents(
    tenantId: string,
    teamId?: string,
  ): Promise<AgentProfileEntity[]> {
    let agentIds: string[] = [];

    if (teamId) {
      // Get agents in the team
      const members = await this.memberRepo.find({
        where: { teamId },
        select: ['userId'],
      });
      agentIds = members.map((m) => m.userId);
    }

    // Query for online agents
    const query = this.agentRepo
      .createQueryBuilder('agent')
      .where('agent.status = :status', { status: AgentStatus.ONLINE });

    if (agentIds.length > 0) {
      query.andWhere('agent.userId IN (:...agentIds)', { agentIds });
    }

    const agents = await query.getMany();

    // Filter by capacity
    const availableAgents: AgentProfileEntity[] = [];
    for (const agent of agents) {
      const openChats = await this.sessionRepo.count({
        where: {
          assignedAgentId: agent.userId,
          status: SessionStatus.ASSIGNED,
        },
      });

      if (openChats < agent.maxConcurrentChats) {
        availableAgents.push(agent);
      }
    }

    return availableAgents;
  }

  /**
   * Round-robin assignment: assigns to agents in a circular order.
   */
  private async assignRoundRobin(
    session: InboxSessionEntity,
  ): Promise<InboxSessionEntity | null> {
    const contextKey = session.assignedTeamId || session.tenantId;
    const agents = await this.getAvailableAgents(
      session.tenantId,
      session.assignedTeamId || undefined,
    );

    if (agents.length === 0) {
      this.logger.warn('No available agents for round-robin assignment');
      return null;
    }

    const lastIndex = this.roundRobinContext[contextKey] ?? -1;
    const nextIndex = (lastIndex + 1) % agents.length;
    this.roundRobinContext[contextKey] = nextIndex;

    const selectedAgent = agents[nextIndex];

    session.assignedAgentId = selectedAgent.userId;
    session.status = SessionStatus.ASSIGNED;

    return this.sessionRepo.save(session);
  }

  /**
   * Load-balanced assignment: assigns to the agent with the fewest open chats.
   */
  private async assignLoadBalanced(
    session: InboxSessionEntity,
  ): Promise<InboxSessionEntity | null> {
    const agents = await this.getAvailableAgents(
      session.tenantId,
      session.assignedTeamId || undefined,
    );

    if (agents.length === 0) {
      this.logger.warn('No available agents for load-balanced assignment');
      return null;
    }

    // Find agent with fewest open chats
    let minChats = Infinity;
    let selectedAgent: AgentProfileEntity | null = null;

    for (const agent of agents) {
      const openChats = await this.sessionRepo.count({
        where: {
          assignedAgentId: agent.userId,
          status: SessionStatus.ASSIGNED,
        },
      });

      if (openChats < minChats) {
        minChats = openChats;
        selectedAgent = agent;
      }
    }

    if (!selectedAgent) {
      return null;
    }

    session.assignedAgentId = selectedAgent.userId;
    session.status = SessionStatus.ASSIGNED;

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

    // Attempt auto-assignment
    const assigned = await this.assignSession(session);

    return assigned || session;
  }
}
