/**
 * ContactAlreadyAssignedRule: skip if this contact already has an ASSIGNED session.
 */

import type {
  AssignmentRequest,
  AssignmentContext,
  RuleResult,
  AssignmentEngineDeps,
} from "../types";

export async function contactAlreadyAssignedRule(
  request: AssignmentRequest,
  _context: AssignmentContext,
  deps: AssignmentEngineDeps,
): Promise<RuleResult> {
  const { session } = request;
  const inbox = deps.inboxService as {
    contactHasAssignedSession: (
      tenantId: string,
      contactId: string,
      excludeSessionId?: string,
    ) => Promise<boolean>;
  };
  const has = await inbox.contactHasAssignedSession(
    session.tenantId,
    session.contactId,
    session.id,
  );
  if (has) return { outcome: "skip" };
  return { outcome: "continue" };
}
