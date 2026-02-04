/**
 * ScheduleRule: if team has schedule and is closed, send OOO or queue and stop.
 */

import { MessageDirection } from "@lib/database";
import type {
  AssignmentRequest,
  AssignmentContext,
  RuleResult,
  AssignmentEngineDeps,
} from "../types";

export async function scheduleRule(
  request: AssignmentRequest,
  _context: AssignmentContext,
  deps: AssignmentEngineDeps,
): Promise<RuleResult> {
  const { session } = request;
  const teamId = session.assignedTeamId;
  if (!teamId) return { outcome: "continue" };

  const check = deps.checkScheduleAvailability;
  if (!check) return { outcome: "continue" };

  const { isOpen, nextOpen, message } = await check(teamId);
  if (isOpen) return { outcome: "continue" };

  const oooMsg = message || "We are currently closed.";
  let action: "ooo" | "queue" = "queue";
  if (nextOpen) {
    const diffHours = (nextOpen.getTime() - Date.now()) / (1000 * 60 * 60);
    if (diffHours > 24) action = "ooo";
  } else {
    action = "ooo";
  }

  if (action === "ooo") {
    const ws = deps.whatsappService as {
      sendMessage: (
        tenantId: string,
        contactId: string,
        text: string,
      ) => Promise<void>;
    };
    const inbox = deps.inboxService as {
      addMessage: (dto: {
        tenantId: string;
        sessionId: string;
        contactId: string;
        direction: string;
        content: string;
        senderId?: string;
      }) => Promise<unknown>;
    };
    try {
      await ws.sendMessage(session.tenantId, session.contactId, oooMsg);
      await inbox.addMessage({
        tenantId: session.tenantId,
        sessionId: session.id,
        contactId: session.contactId,
        direction: MessageDirection.OUTBOUND,
        content: oooMsg,
        senderId: undefined,
      });
    } catch (e) {
      return {
        outcome: "error",
        message: e instanceof Error ? e.message : "Failed to send OOO message",
      };
    }
  }

  return { outcome: "stop" };
}
