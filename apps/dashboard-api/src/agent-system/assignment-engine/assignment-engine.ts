/**
 * Assignment engine: runs a pipeline of rules in order.
 * First non-`continue` result ends the pipeline.
 * See docs/architecture/assignment_engine_design.md.
 */

import { Logger } from "@nestjs/common";
import type {
  AssignmentRequest,
  AssignmentContext,
  RuleResult,
  AssignmentRule,
  AssignmentEngineDeps,
} from "./types";

export class AssignmentEngine {
  private readonly logger = new Logger(AssignmentEngine.name);
  private rules: AssignmentRule[] = [];

  constructor(private readonly deps: AssignmentEngineDeps) {}

  /**
   * Register rules in pipeline order. Called during module init or by factory.
   * Phase 1: no rules registered; run() returns stop.
   */
  setRules(rules: AssignmentRule[]): void {
    this.rules = rules;
  }

  /**
   * Run the pipeline. Returns first non-`continue` result.
   * If all rules return `continue` or there are no rules, returns `{ outcome: 'stop' }`.
   * Logs per-rule duration (assignment_engine.rule_duration) and final outcome for observability.
   */
  async run(request: AssignmentRequest): Promise<RuleResult> {
    const context: AssignmentContext = {};

    for (const rule of this.rules) {
      const ruleName = rule.name || "anonymous";
      const start = Date.now();
      const result = await rule(request, context, this.deps);
      const durationMs = Date.now() - start;
      this.logger.debug(
        `assignment_engine.rule_duration rule=${ruleName} durationMs=${durationMs}`,
      );
      if (result.outcome !== "continue") {
        this.logger.debug(
          `assignment_engine.outcome outcome=${result.outcome} sessionId=${request.session.id}${"message" in result ? ` message=${result.message}` : ""}`,
        );
        return result;
      }
    }

    this.logger.debug(
      `assignment_engine.outcome outcome=stop sessionId=${request.session.id}`,
    );
    return { outcome: "stop" };
  }
}
