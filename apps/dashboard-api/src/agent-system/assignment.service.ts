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

    // CHECK SCHEDULE AVAILABILITY
    if (teamId) {
      const { isOpen, nextOpen, message } = await this.checkScheduleAvailability(teamId);
      if (!isOpen) {
          this.logger.log(`Team ${teamId} is closed. Next open: ${nextOpen}`);
          
          let action = 'queue';
          if (nextOpen) {
              const diffMs = nextOpen.getTime() - Date.now();
              const diffHours = diffMs / (1000 * 60 * 60);
              if (diffHours > 24) {
                  action = 'ooo';
              }
          } else {
              action = 'ooo'; // No known next shift
          }

          if (action === 'ooo') {
               const oooMsg = message || "We are currently closed.";
               try {
                  await this.whatsappService.sendMessage(session.tenantId, session.contactId, oooMsg);
                  await this.inboxService.addMessage({
                      tenantId: session.tenantId,
                      sessionId: session.id,
                      contactId: session.contactId,
                      direction: MessageDirection.OUTBOUND,
                      content: oooMsg,
                      senderId: undefined // system
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
    const noAgentAction = waterfall?.noAgentAction || 'queue'; // 'queue' | 'reply'

    if (noAgentAction === 'reply') {
        const messageText = waterfall?.noAgentMessage || 'All of our agents are currently busy. We will get back to you shortly.';
        
        try {
            // Send WA message
            await this.whatsappService.sendMessage(session.tenantId, session.contactId, messageText);
            
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

  /**
   * Checks if the team is currently available based on its schedule.
   */
  async checkScheduleAvailability(teamId: string): Promise<{ isOpen: boolean; nextOpen?: Date; message?: string }> {
      const team = await this.teamRepo.findOne({ where: { id: teamId } });
      if (!team || !team.schedule || !team.schedule.enabled) {
          return { isOpen: true }; // Default to open if no schedule
      }

      const { timezone, days, outOfOfficeMessage } = team.schedule;
      
      const now = new Date();
      // Helper to get day/time in target zone
      const getParts = (d: Date) => {
          const options: Intl.DateTimeFormatOptions = { timeZone: timezone, weekday: 'long', hour: 'numeric', minute: 'numeric', hour12: false };
          const formatter = new Intl.DateTimeFormat('en-US', options);
          const parts = formatter.formatToParts(d);
          const day = parts.find(p => p.type === 'weekday')?.value.toLowerCase() || '';
          const h = parseInt(parts.find(p => p.type === 'hour')?.value || '0');
          const m = parseInt(parts.find(p => p.type === 'minute')?.value || '0');
          return { day, h, m, mins: h * 60 + m };
      };

      const current = getParts(now);
      
      // Check today's shifts
      const dayShifts = days[current.day] || [];
      for (const shift of dayShifts) {
          const [startH, startM] = shift.start.split(':').map(Number);
          const [endH, endM] = shift.end.split(':').map(Number);
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
               const [startH, startM] = shift.start.split(':').map(Number);
               const startMins = startH * 60 + startM;
               
               // If it's today (i=0), shift must be in future
               if (i === 0 && startMins <= current.mins) continue;
               
               // Found next shift
               // Calculate minutes until that shift
               // (i * 24h) + (shiftStartMins - currentMins)
               // Only works correctly if timezone doesn't change offset in these days (mostly fine)
               const minutesUntil = (i * 24 * 60) + (startMins - current.mins);
               const nextOpenDate = new Date(now.getTime() + minutesUntil * 60 * 1000);
               
               return { isOpen: false, nextOpen: nextOpenDate, message: outOfOfficeMessage };
          }
      }

      return { isOpen: false, message: outOfOfficeMessage };
  }
}
