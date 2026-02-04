/**
 * StrategyRule: resolve strategy + config; if manual, stop; else set context and continue.
 */

import type {
  AssignmentRequest,
  AssignmentContext,
  RuleResult,
  AssignmentEngineDeps,
} from "../types";

export async function strategyRule(
  request: AssignmentRequest,
  context: AssignmentContext,
  deps: AssignmentEngineDeps,
): Promise<RuleResult> {
  const { session } = request;
  const getStrategy = deps.getStrategyWithType;
  if (!getStrategy) return { outcome: "continue" };

  const { strategy, config } = await getStrategy(
    session.tenantId,
    session.assignedTeamId ?? undefined,
  );

  if (strategy === "manual") return { outcome: "stop" };

  context.strategy = strategy;
  context.config = config;
  return { outcome: "continue" };
}
