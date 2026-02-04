/**
 * NoAgentRule: send no-agent message and/or record (used by EligibilityRule and SelectorRule).
 * Delegates to deps.runNoAgentFallback when provided (AssignmentService implementation).
 */

import { MessageDirection, type InboxSessionEntity } from "@lib/database";
import type { AssignmentEngineDeps } from "../types";

export async function runNoAgentFallback(
  session: InboxSessionEntity,
  deps: AssignmentEngineDeps,
): Promise<void> {
  if (deps.runNoAgentFallback) {
    await deps.runNoAgentFallback(session);
    return;
  }
  // Fallback if engine used without runNoAgentFallback (e.g. tests)
  const configRepo = deps.configRepo as {
    findOne: (opts: {
      where: { tenantId: string; teamId: undefined; enabled: boolean };
    }) => Promise<{
      settings?: {
        waterfall?: { noAgentAction?: string; noAgentMessage?: string };
      };
    } | null>;
  };
  const config = await configRepo.findOne({
    where: { tenantId: session.tenantId, teamId: undefined, enabled: true },
  });
  const waterfall = config?.settings?.waterfall;
  const noAgentAction = waterfall?.noAgentAction || "queue";
  if (noAgentAction !== "reply") return;

  const messageText =
    waterfall?.noAgentMessage ||
    "All of our agents are currently busy. We will get back to you shortly.";
  const ws = deps.whatsappService as {
    sendMessage: (
      tenantId: string,
      contactId: string,
      text: string,
      options?: { account?: string },
    ) => Promise<unknown>;
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
  const account = (session.context as Record<string, unknown>)?.account as
    | string
    | undefined;
  try {
    await ws.sendMessage(session.tenantId, session.contactId, messageText, {
      account,
    });
    await inbox.addMessage({
      tenantId: session.tenantId,
      sessionId: session.id,
      contactId: session.contactId,
      direction: MessageDirection.OUTBOUND,
      content: messageText,
      senderId: undefined,
    });
  } catch (_e) {
    // Logged by caller if needed
  }
}
