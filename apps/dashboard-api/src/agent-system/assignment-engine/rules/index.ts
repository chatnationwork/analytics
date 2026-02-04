/**
 * Assignment engine rules in pipeline order.
 */

import type { AssignmentRule } from "../types";
import { scheduleRule } from "./schedule.rule";
import { contactAlreadyAssignedRule } from "./contact-already-assigned.rule";
import { strategyRule } from "./strategy.rule";
import { eligibilityRule } from "./eligibility.rule";
import { selectorRule } from "./selector.rule";

export const ASSIGNMENT_ENGINE_RULES: AssignmentRule[] = [
  scheduleRule,
  contactAlreadyAssignedRule,
  strategyRule,
  eligibilityRule,
  selectorRule,
];

export { scheduleRule } from "./schedule.rule";
export { contactAlreadyAssignedRule } from "./contact-already-assigned.rule";
export { strategyRule } from "./strategy.rule";
export { eligibilityRule } from "./eligibility.rule";
export { runNoAgentFallback } from "./no-agent.rule";
export { selectorRule } from "./selector.rule";
