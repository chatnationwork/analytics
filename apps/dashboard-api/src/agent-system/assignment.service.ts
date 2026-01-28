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
  TenantMembershipEntity,
  MembershipRole,
  MessageDirection,
} from '@lib/database';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import { InboxService } from './inbox.service';

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
  /**
   * Gets available agents for assignment using "Waterfall" Logic.
   * 1. Check Team Members
   * 2. Check General Members (Role: MEMBER)
   * 3. Check Admins
   * 4. Check Super Admins
   * 
   * Ignores "Online" status and Capacity for now (MVP).
   */
  /**
   * Gets available agents using Configurable Waterfall Logic.
   */
  private async getAvailableAgents(
    tenantId: string,
    teamId?: string,
  ): Promise<string[]> {
    // 1. Fetch Config
    const config = await this.configRepo.findOne({
      where: { tenantId, teamId: undefined, enabled: true },
    });
    
    // Default Waterfall Settings
    const waterfall = config?.settings?.waterfall || {
       levels: ['team', 'member', 'admin', 'super_admin'],
       enabled: true
    };
    
    // Ordered levels to check
    const levelsToCheck = waterfall.levels || ['team', 'member', 'admin', 'super_admin'];

    for (const level of levelsToCheck) {
        let foundIds: string[] = [];

        if (level === 'team' && teamId) {
             const teamMembers = await this.memberRepo.find({ where: { teamId }, select: ['userId'] });
             foundIds = teamMembers.map(m => m.userId);
             if (foundIds.length > 0) this.logger.log(`Found ${foundIds.length} agents in Team ${teamId}`);
        } else if (level !== 'team') {
             // Treat level as role
             const role = level as MembershipRole; 
             // Note: 'member' in stored settings maps to 'member' role, etc.
             const members = await this.tenantMembershipRepo.find({
                 where: { tenantId, role },
                 select: ['userId']
             });
             foundIds = members.map(m => m.userId);
             if (foundIds.length > 0) this.logger.log(`Found ${foundIds.length} users with role ${role}`);
        }

        if (foundIds.length > 0) {
            return foundIds;
        }
    }

    this.logger.warn('No agents found in configurable waterfall');
    return [];
  }

  /**
   * Round-robin assignment: assigns to agents in a circular order.
   */
  private async assignRoundRobin(
    session: InboxSessionEntity,
  ): Promise<InboxSessionEntity | null> {
    const contextKey = session.assignedTeamId || session.tenantId;
    const agentIds = await this.getAvailableAgents(
      session.tenantId,
      session.assignedTeamId || undefined,
    );

    if (agentIds.length === 0) {
      this.logger.warn('No available agents for round-robin assignment');
      return null;
    }

    const lastIndex = this.roundRobinContext[contextKey] ?? -1;
    const nextIndex = (lastIndex + 1) % agentIds.length;
    this.roundRobinContext[contextKey] = nextIndex;

    const selectedAgentId = agentIds[nextIndex];

    session.assignedAgentId = selectedAgentId;
    session.status = SessionStatus.ASSIGNED;

    return this.sessionRepo.save(session);
  }

  /**
   * Load-balanced assignment: assigns to the agent with the fewest open chats.
   */
  private async assignLoadBalanced(
    session: InboxSessionEntity,
  ): Promise<InboxSessionEntity | null> {
    const agentIds = await this.getAvailableAgents(
      session.tenantId,
      session.assignedTeamId || undefined,
    );

    if (agentIds.length === 0) {
      this.logger.warn('No available agents for load-balanced assignment');
      return null;
    }

    // Find agent with fewest open chats
    let minChats = Infinity;
    let selectedAgentId: string | null = null;

    for (const userId of agentIds) {
      const openChats = await this.sessionRepo.count({
        where: {
          assignedAgentId: userId,
          status: SessionStatus.ASSIGNED,
        },
      });

      if (openChats < minChats) {
        minChats = openChats;
        selectedAgentId = userId;
      }
    }

    if (!selectedAgentId) {
       // Should not happen if list > 0, unless all are somehow unavailable (not checked here)
       selectedAgentId = agentIds[0];
    }

    session.assignedAgentId = selectedAgentId;
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

    if (assigned) {
        return assigned;
    }

    // --- NO AGENT AVAILABLE HANDLING ---
    
    // 1. Fetch Config
    const config = await this.configRepo.findOne({
      where: { tenantId: session.tenantId, teamId: undefined, enabled: true },
    });

    const waterfall = config?.settings?.waterfall;
    const noAgentAction = waterfall?.noAgentAction || 'queue'; // 'queue' | 'reply'

    if (noAgentAction === 'reply') {
        const messageText = waterfall?.noAgentMessage || 'All of our agents are currently busy. We will get back to you shortly.';
        
        try {
            // Send WA message
            await this.whatsappService.sendMessage(session.contactId, messageText);
            
            // Record in Inbox
            await this.inboxService.addMessage({
                tenantId: session.tenantId,
                sessionId: session.id,
                contactId: session.contactId,
                direction: MessageDirection.OUTBOUND,
                content: messageText,
                senderId: undefined // system
            });
            this.logger.log(`Sent no-agent fallback message to ${session.contactId}`);
        } catch (e) {
            this.logger.error('Failed to send no-agent fallback message', e);
        }
    }

    return session;
  }
}
