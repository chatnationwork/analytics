"use client";

import { useState, useEffect, useMemo } from "react";
import { Message, type InboxSession } from "@/lib/api/agent";
import { Clock } from "lucide-react";

const EXPIRY_HOURS = 24;
const EXPIRY_MS = EXPIRY_HOURS * 60 * 60 * 1000;
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

  const expiryAt = useMemo(() => {
    if (session?.lastMessageAt) {
      const lastAt = new Date(session.lastMessageAt).getTime();
      return new Date(lastAt + EXPIRY_MS);
    }
    const inbound = messages.filter((m) => m.direction === "inbound");
    if (inbound.length === 0) return null;
    const lastAt = inbound.reduce(
      (max, m) => (m.createdAt > max ? m.createdAt : max),
      inbound[0].createdAt,
    );
    return new Date(new Date(lastAt).getTime() + EXPIRY_MS);
  }, [messages, session?.lastMessageAt]);

  useEffect(() => {
    if (!show || !expiryAt) return;
    const interval = setInterval(() => setNow(new Date()), TICK_MS);
    return () => clearInterval(interval);
  }, [show, expiryAt]);

  if (!show) return null;

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

  const rawRemainingMs = expiryAt.getTime() - now.getTime();
  if (rawRemainingMs <= 0) {
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

  // Clamp so we never show more than 24h (avoids clock skew / future timestamps)
  const remainingMs = Math.min(rawRemainingMs, EXPIRY_MS);
  const totalMinutes = Math.floor(remainingMs / (60 * 1000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const label =
    hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

  let colorClass = "text-red-600 dark:text-red-400 bg-red-500/10";
  if (hours >= 16) {
    colorClass = "text-green-600 dark:text-green-400 bg-green-500/10";
  } else if (hours >= 8) {
    colorClass = "text-amber-600 dark:text-amber-400 bg-amber-500/10";
  }

  return (
    <div
      className={`flex items-center justify-center gap-2 py-2 px-3 text-xs border-b ${colorClass}`}
      role="timer"
      aria-live="polite"
      aria-label={label}
    >
      <Clock className="h-3.5 w-3.5 shrink-0" />
      <span>{label}</span>
    </div>
  );
}
