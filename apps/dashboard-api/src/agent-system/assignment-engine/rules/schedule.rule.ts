/**
 * ScheduleRule: if team has schedule and is closed, send OOO or queue and stop.
 * OOO message is sent at most once per session per 24h to avoid spamming the user.
 */

import { MessageDirection } from "@lib/database";
import type { Repository } from "typeorm";
import type { InboxSessionEntity } from "@lib/database";
import type {
  AssignmentRequest,
  AssignmentContext,
  RuleResult,
  AssignmentEngineDeps,
} from "../types";

const OOO_THROTTLE_MS = 24 * 60 * 60 * 1000; // 24 hours

function shouldSendOoo(session: InboxSessionEntity): boolean {
  const ctx = session.context as Record<string, unknown> | null | undefined;
  const sentAt = ctx?.oooLastSentAt;
  if (typeof sentAt !== "string") return true;
  const t = Date.parse(sentAt);
  if (Number.isNaN(t)) return true;
  return Date.now() - t > OOO_THROTTLE_MS;
}

export async function scheduleRule(
  request: AssignmentRequest,
  _context: AssignmentContext,
  deps: AssignmentEngineDeps,
): Promise<RuleResult> {
  const { session } = request;

  // Force override: skip schedule check entirely
  if (request.forceOverride) return { outcome: "continue" };

  const teamId = session.assignedTeamId;
  if (!teamId) return { outcome: "continue" };

  const check = deps.checkScheduleAvailability;
  if (!check) return { outcome: "continue" };

  const { isOpen, nextOpen, message, mediaUrl } = await check(teamId);
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
    if (!shouldSendOoo(session)) {
      return { outcome: "stop" };
    }
    const ws = deps.whatsappService as {
      sendMessage: (
        tenantId: string,
        contactId: string,
        text: string | { type: "image"; image: { link: string; caption?: string } },
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
        attachment?: { type: "image"; url: string };
      }) => Promise<unknown>;
    };
    const account = (session.context as Record<string, unknown>)?.account as
      | string
      | undefined;
    
    try {
      if (mediaUrl) {
        await ws.sendMessage(
          session.tenantId,
          session.contactId,
          {
            type: "image",
            image: { link: mediaUrl, caption: oooMsg },
          },
          { account },
        );
        await inbox.addMessage({
          tenantId: session.tenantId,
          sessionId: session.id,
          contactId: session.contactId,
          direction: MessageDirection.OUTBOUND,
          content: oooMsg,
          attachment: { type: "image", url: mediaUrl },
          senderId: undefined,
        });
      } else {
        await ws.sendMessage(session.tenantId, session.contactId, oooMsg, {
          account,
        });
        await inbox.addMessage({
          tenantId: session.tenantId,
          sessionId: session.id,
          contactId: session.contactId,
          direction: MessageDirection.OUTBOUND,
          content: oooMsg,
          senderId: undefined,
        });
      }
      const repo = deps.sessionRepo as Repository<InboxSessionEntity>;
      const mergedContext: Record<string, any> = {
        ...((session.context as Record<string, any>) || {}),
        oooLastSentAt: new Date().toISOString(),
      };
      await repo.update(session.id, { context: mergedContext });
    } catch (e) {
      return {
        outcome: "error",
        message: e instanceof Error ? e.message : "Failed to send OOO message",
      };
    }
  }

  return { outcome: "stop" };
}
