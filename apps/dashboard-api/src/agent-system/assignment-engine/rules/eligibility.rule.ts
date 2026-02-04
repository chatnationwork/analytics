/**
 * EligibilityRule: compute available agents; if none, run NoAgentRule and stop; else set context.agents and continue.
 */

import type {
  AssignmentRequest,
  AssignmentContext,
  RuleResult,
  AssignmentEngineDeps,
} from "../types";
import { runNoAgentFallback } from "./no-agent.rule";

export async function eligibilityRule(
  request: AssignmentRequest,
  context: AssignmentContext,
  deps: AssignmentEngineDeps,
): Promise<RuleResult> {
  const { session } = request;
  const getAgents = deps.getAvailableAgents;
  if (!getAgents) return { outcome: "continue" };

  const agentIds = await getAgents(
    session.tenantId,
    session.assignedTeamId ?? undefined,
  );

  if (agentIds.length === 0) {
    await runNoAgentFallback(session, deps);
    return { outcome: "stop" };
  }

  context.agents = agentIds;
  return { outcome: "continue" };
}
