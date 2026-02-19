/**
 * NoAgentRule: send no-agent message and/or record (used by EligibilityRule and SelectorRule).
 * Throttled to at most once per 24h per session to prevent spamming.
 * Delegates to deps.runNoAgentFallback when provided (AssignmentService implementation).
 */

import { MessageDirection, type InboxSessionEntity } from "@lib/database";
import type { AssignmentEngineDeps } from "../types";

/**
 * Check whether the no-agent message was already sent within the last 24h.
 * Uses `noAgentLastSentAt` stored in session.context.
 */
function isThrottled(session: InboxSessionEntity): boolean {
  const ctx = session.context as Record<string, unknown> | null | undefined;
  const sentAt = ctx?.noAgentLastSentAt;
  if (typeof sentAt === "string") {
    const t = Date.parse(sentAt);
    if (!Number.isNaN(t) && Date.now() - t < 24 * 60 * 60 * 1000) {
      return true;
    }
  }
  return false;
}

/**
 * Sends the no-agent fallback message to the user when no agents are available.
 * Delegates to deps.runNoAgentFallback (which has its own throttle) when provided.
 * Falls back to sending directly via deps.whatsappService/inboxService otherwise.
 */
export async function runNoAgentFallback(
  session: InboxSessionEntity,
  deps: AssignmentEngineDeps,
): Promise<void> {
  if (deps.runNoAgentFallback) {
    // Service-level implementation has its own throttle
    await deps.runNoAgentFallback(session);
    return;
  }

  // Throttle: only send once per 24h per session
  if (isThrottled(session)) return;

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
  const noAgentAction = waterfall?.noAgentAction || "reply";
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
    // Stamp throttle timestamp so we don't send again within 24h
    session.context = {
      ...((session.context as Record<string, unknown>) || {}),
      noAgentLastSentAt: new Date().toISOString(),
    };
  } catch (_e) {
    // Logged by caller if needed
  }
}
