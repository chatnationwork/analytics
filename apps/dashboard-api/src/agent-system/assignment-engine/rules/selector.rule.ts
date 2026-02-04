/**
 * SelectorRule: pick one agent from context.agents by context.strategy; return assign(agentId) or run NoAgentRule and stop.
 */

import type {
  AssignmentRequest,
  AssignmentContext,
  RuleResult,
  AssignmentEngineDeps,
} from "../types";
import { runNoAgentFallback } from "./no-agent.rule";

export async function selectorRule(
  request: AssignmentRequest,
  context: AssignmentContext,
  deps: AssignmentEngineDeps,
): Promise<RuleResult> {
  const { session } = request;
  const strategy = context.strategy ?? "round_robin";
  const agentIds = context.agents ?? [];
  const config = context.config;

  if (agentIds.length === 0) {
    await runNoAgentFallback(session, deps);
    return { outcome: "stop" };
  }

  const pick = deps.pickAgentForSession;
  if (!pick) return { outcome: "stop" };

  const agentId = await pick(session, strategy, config, agentIds);
  if (agentId) return { outcome: "assign", agentId };

  await runNoAgentFallback(session, deps);
  return { outcome: "stop" };
}
