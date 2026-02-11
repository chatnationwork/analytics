import { InboxSession, Message } from "@/lib/api/agent";

export const SESSION_EXPIRY_HOURS = 24;
export const SESSION_EXPIRY_MS = SESSION_EXPIRY_HOURS * 60 * 60 * 1000;

export type SessionExpiryStatus = "valid" | "expired" | "resolved";

export interface SessionExpiryInfo {
  expiryAt: Date | null;
  hoursRemaining: number;
  minutesRemaining: number;
  isExpired: boolean;
  statusColorClass: string; // Tailwind class for text/bg
  borderColorClass: string; // Tailwind class for border
}

/**
 * Calculates expiry information for a session.
 * Uses session.lastMessageAt if available, otherwise falls back to messages array.
 */
export function getSessionExpiryInfo(
  session: InboxSession | undefined | null,
  messages: Message[] = [],
  now: Date = new Date()
): SessionExpiryInfo {
  if (!session || session.status === "resolved") {
    return {
      expiryAt: null,
      hoursRemaining: 0,
      minutesRemaining: 0,
      isExpired: false,
      statusColorClass: "text-muted-foreground bg-muted",
      borderColorClass: "border-l-transparent",
    };
  }

  let expiryAt: Date | null = null;

  if (session.lastMessageAt) {
    const lastAt = new Date(session.lastMessageAt).getTime();
    expiryAt = new Date(lastAt + SESSION_EXPIRY_MS);
  } else {
    // Fallback if lastMessageAt is missing (rare for established sessions)
    const inbound = messages.filter((m) => m.direction === "inbound");
    if (inbound.length > 0) {
      const lastAt = inbound.reduce(
        (max, m) => (m.createdAt > max ? m.createdAt : max),
        inbound[0].createdAt
      );
      expiryAt = new Date(new Date(lastAt).getTime() + SESSION_EXPIRY_MS);
    }
  }

  if (!expiryAt) {
    // No inbound messages yet
    return {
      expiryAt: null,
      hoursRemaining: 24,
      minutesRemaining: 0,
      isExpired: false,
      statusColorClass: "text-muted-foreground bg-muted",
      borderColorClass: "border-l-transparent",
    };
  }

  const rawRemainingMs = expiryAt.getTime() - now.getTime();
  const isExpired = rawRemainingMs <= 0;

  if (isExpired) {
    return {
      expiryAt,
      hoursRemaining: 0,
      minutesRemaining: 0,
      isExpired: true,
      statusColorClass: "text-orange-600 dark:text-orange-400 bg-orange-500/10",
      borderColorClass: "border-l-orange-500",
    };
  }

  const remainingMs = Math.min(rawRemainingMs, SESSION_EXPIRY_MS);
  const totalMinutes = Math.floor(remainingMs / (60 * 1000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  let statusColorClass = "text-red-600 dark:text-red-400 bg-red-500/10";
  let borderColorClass = "border-l-red-500";

  if (hours >= 16) {
    statusColorClass = "text-green-600 dark:text-green-400 bg-green-500/10";
    borderColorClass = "border-l-green-500";
  } else if (hours >= 8) {
    statusColorClass = "text-amber-600 dark:text-amber-400 bg-amber-500/10";
    borderColorClass = "border-l-amber-500";
  }

  return {
    expiryAt,
    hoursRemaining: hours,
    minutesRemaining: minutes,
    isExpired: false,
    statusColorClass,
    borderColorClass,
  };
}
