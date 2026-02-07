"use client";

import { useState, useEffect, useMemo } from "react";
import { Message } from "@/lib/api/agent";
import { Clock } from "lucide-react";

const EXPIRY_HOURS = 24;
const EXPIRY_MS = EXPIRY_HOURS * 60 * 60 * 1000;
const TICK_MS = 60 * 1000; // update every minute

interface SessionExpiryTimerProps {
  messages: Message[];
  /** When true, caller hides this (e.g. resolved session). */
  show: boolean;
}

/**
 * Time remaining before the 24-hour session expires.
 * Timer is based only on the last inbound (taxpayer) message; agent messages do not reset it.
 */
export function SessionExpiryTimer({
  messages,
  show,
}: SessionExpiryTimerProps) {
  const [now, setNow] = useState(() => new Date());

  const expiryAt = useMemo(() => {
    const inbound = messages.filter((m) => m.direction === "inbound");
    if (inbound.length === 0) return null;
    const lastAt = inbound.reduce(
      (max, m) => (m.createdAt > max ? m.createdAt : max),
      inbound[0].createdAt,
    );
    return new Date(new Date(lastAt).getTime() + EXPIRY_MS);
  }, [messages]);

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

  const remainingMs = expiryAt.getTime() - now.getTime();
  if (remainingMs <= 0) {
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

  const totalMinutes = Math.floor(remainingMs / (60 * 1000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const label =
    hours > 0 ? `Expires in ${hours}h ${minutes}m` : `Expires in ${minutes}m`;

  return (
    <div
      className="flex items-center justify-center gap-2 py-2 px-3 text-xs text-muted-foreground border-b bg-muted/10"
      role="timer"
      aria-live="polite"
      aria-label={label}
    >
      <Clock className="h-3.5 w-3.5 shrink-0" />
      <span>{label}</span>
    </div>
  );
}
