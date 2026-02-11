"use client";

import { useState, useEffect } from "react";
import { Message, type InboxSession } from "@/lib/api/agent";
import { Clock } from "lucide-react";
import {
  getSessionExpiryInfo,
  SESSION_EXPIRY_MS,
  SESSION_EXPIRY_HOURS,
} from "@/lib/session-utils";

const TICK_MS = 60 * 1000; // update every minute

interface SessionExpiryTimerProps {
  messages: Message[];
  /** Session from server (getSession); when present, lastMessageAt is used so timer matches backend and resets when user texts again. */
  session?: InboxSession | null;
  /** When true, caller hides this (e.g. resolved session). */
  show: boolean;
}

/**
 * Time remaining before the 24-hour session expires.
 * Uses session.lastMessageAt when available (stays in sync with backend; resets when contact sends a new message).
 * Otherwise falls back to last inbound message createdAt.
 * Display is clamped to at most 24h to avoid clock skew showing "24h+".
 */
export function SessionExpiryTimer({
  messages,
  session,
  show,
}: SessionExpiryTimerProps) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    if (!show) return;
    const interval = setInterval(() => setNow(new Date()), TICK_MS);
    return () => clearInterval(interval);
  }, [show]);

  if (!show) return null;

  const {
    expiryAt,
    hoursRemaining,
    minutesRemaining,
    isExpired,
    statusColorClass,
  } = getSessionExpiryInfo(session, messages, now);

  if (!expiryAt) {
    return (
      <div
        className="flex items-center justify-center gap-2 py-2 px-3 text-xs text-muted-foreground border-b bg-muted/10"
        role="status"
      >
        <Clock className="h-3.5 w-3.5 shrink-0" />
        <span>24h window starts when customer sends a message</span>
      </div>
    );
  }

  if (isExpired) {
    return (
      <div
        className="flex items-center justify-center gap-2 py-2 px-3 text-xs text-orange-600 dark:text-orange-400 border-b bg-orange-500/10"
        role="status"
      >
        <Clock className="h-3.5 w-3.5 shrink-0" />
        <span>Session expired</span>
      </div>
    );
  }

  const label =
    hoursRemaining > 0
      ? `${hoursRemaining}h ${minutesRemaining}m`
      : `${minutesRemaining}m`;

  return (
    <div
      className={`flex items-center justify-center gap-2 py-2 px-3 text-xs border-b ${statusColorClass}`}
      role="timer"
      aria-live="polite"
      aria-label={label}
    >
      <Clock className="h-3.5 w-3.5 shrink-0" />
      <span>{label}</span>
    </div>
  );
}
