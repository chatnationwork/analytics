/**
 * Assignment engine types.
 * See docs/architecture/assignment_engine_design.md.
 */

import type { InboxSessionEntity } from "@lib/database";

/** Source of the assignment attempt: handover (bot) or queue (goOnline / assign-queue). */
export type AssignmentSource = "handover" | "queue";

/** Immutable input for one assignment attempt. */
export interface AssignmentRequest {
  /** Session to assign (must have id, tenantId, contactId, assignedTeamId, context). */
  session: InboxSessionEntity;
  /** Source of the request; can drive conditional behaviour (e.g. no-agent fallback in queue). */
  source: AssignmentSource;
  /** When true, bypass schedule and availability checks (bulk transfer override). */
  forceOverride?: boolean;
}

/** Mutable context for the pipeline (strategy, config, agents, selected agent). */
export interface AssignmentContext {
  /** Resolved strategy name (set by StrategyRule). */
  strategy?: string;
  /** Strategy config from team/tenant (set by StrategyRule). */
  config?: Record<string, unknown>;
  /** Available agent IDs (set by EligibilityRule). */
  agents?: string[];
  /** Reason for skip/stop (optional; for logging). */
  reason?: string;
}

/** Result of a single rule; pipeline stops on first non-continue. */
export type RuleResult =
  | { outcome: "continue" }
  | { outcome: "skip" }
  | { outcome: "assign"; agentId: string }
  | { outcome: "stop" }
  | { outcome: "error"; message: string };

/** Schedule check result (from AssignmentService.checkScheduleAvailability). */
export interface ScheduleAvailability {
  isOpen: boolean;
  nextOpen?: Date;
  message?: string;
  mediaUrl?: string;
}

/** Strategy resolution (from getStrategyWithType). */
export interface StrategyWithType {
  strategy: string;
  config?: Record<string, unknown>;
}

/** Dependencies passed to rules. AssignmentService provides repos + services + these callbacks. */
export interface AssignmentEngineDeps {
  sessionRepo: unknown;
  teamRepo: unknown;
  memberRepo: unknown;
  agentRepo: unknown;
  configRepo: unknown;
  inboxService: unknown;
  whatsappService: unknown;
  /** Check team schedule; used by ScheduleRule. */
  checkScheduleAvailability?: (teamId: string) => Promise<ScheduleAvailability>;
  /** Resolve strategy + config; used by StrategyRule. */
  getStrategyWithType?: (
    tenantId: string,
    teamId?: string,
  ) => Promise<StrategyWithType>;
  /** Get eligible agent IDs (online, under maxLoad); used by EligibilityRule. */
  getAvailableAgents?: (tenantId: string, teamId?: string, includeOffline?: boolean) => Promise<string[]>;
  /** Pick one agent by strategy; used by SelectorRule. Returns null if none. */
  pickAgentForSession?: (
    session: InboxSessionEntity,
    strategy: string,
    config: Record<string, unknown> | undefined,
    agentIds: string[],
  ) => Promise<string | null>;
  /** Send no-agent message / record; used by EligibilityRule and SelectorRule. */
  runNoAgentFallback?: (session: InboxSessionEntity) => Promise<void>;
  [key: string]: unknown;
}

/** A rule: async (request, context, deps) => RuleResult. */
export type AssignmentRule = (
  request: AssignmentRequest,
  context: AssignmentContext,
  deps: AssignmentEngineDeps,
) => Promise<RuleResult>;
