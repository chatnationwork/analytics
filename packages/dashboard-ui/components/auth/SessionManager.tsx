"use client";

import { useIdleTimer } from "react-idle-timer";
import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { fetchWithAuth, logout } from "@/lib/api";
import { useAuth } from "./AuthProvider";

/**
 * Inner component that handles the actual idle timer.
 * This is mounted only after settings are loaded, ensuring
 * the timeout value is correct from the start.
 *
 * Uses two mechanisms:
 * 1. react-idle-timer – fires onIdle when no keyboard/mouse for `timeoutMinutes`
 * 2. visibilitychange – catches sleep/wake where JS timers are suspended
 */
function IdleTimerHandler({ timeoutMinutes }: { timeoutMinutes: number }) {
  const router = useRouter();
  const hasLoggedOut = useRef(false);
  /** Tracks the last time any user interaction occurred. */
  const lastActiveRef = useRef(Date.now());

  /** Shared logout handler — prevents duplicate calls */
  const performLogout = useCallback(() => {
    if (hasLoggedOut.current) return;
    hasLoggedOut.current = true;
    console.log(`User idle for ${timeoutMinutes} minutes. Logging out...`);
    logout("idle");
    router.push("/login?reason=idle");
  }, [timeoutMinutes, router]);

  useIdleTimer({
    onIdle: performLogout,
    onAction: () => {
      // Track last user interaction for the visibilitychange fallback
      lastActiveRef.current = Date.now();
    },
    timeout: timeoutMinutes * 60 * 1000,
    throttle: 500,
  });

  // Catch sleep/wake: when the tab becomes visible, check if the elapsed
  // time since last activity exceeds the timeout.  JS timers are suspended
  // during sleep so react-idle-timer alone cannot detect this.
  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState !== "visible") return;
      const elapsedMs = Date.now() - lastActiveRef.current;
      if (elapsedMs > timeoutMinutes * 60 * 1000) {
        performLogout();
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [timeoutMinutes, performLogout]);

  return null;
}

/**
 * SessionManager enforces inactivity timeout by logging out idle users.
 *
 * How it works:
 * - Only runs when user is authenticated (via AuthContext)
 * - Fetches inactivityTimeoutMinutes from tenant settings
 * - Uses react-idle-timer to detect user inactivity (no mouse/keyboard/touch)
 * - Logs user out and redirects to /login?reason=idle when idle too long
 */
export function SessionManager() {
  const { user, isLoading } = useAuth();
  const [timeoutMinutes, setTimeoutMinutes] = useState<number | null>(null);

  // Fetch settings when user is authenticated
  useEffect(() => {
    // Don't fetch if not authenticated or still loading auth state
    if (isLoading || !user) {
      return;
    }

    const isLocalDev =
      typeof window !== "undefined" &&
      (window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1");
    const defaultTimeoutMinutes = isLocalDev ? 480 : 30;

    fetchWithAuth("/tenants/current")
      .then((data) => {
        const timeout =
          data?.settings?.session?.inactivityTimeoutMinutes ??
          defaultTimeoutMinutes;
        console.log(`[SessionManager] Inactivity timeout: ${timeout} minutes`);
        setTimeoutMinutes(timeout);
      })
      .catch((err) => {
        // Don't log or set timeout on session expired - user will be redirected
        if (err.message === "Session expired") {
          return;
        }
        console.error("[SessionManager] Failed to fetch settings:", err);
        // Use longer default in local dev so you don't get logged out every 30 min
        setTimeoutMinutes(defaultTimeoutMinutes);
      });
  }, [isLoading, user]);

  // Reset timeout when user logs out
  useEffect(() => {
    if (!user) {
      setTimeoutMinutes(null);
    }
  }, [user]);

  // Don't render until user is authenticated and settings are loaded
  if (isLoading || !user || timeoutMinutes === null) {
    return null;
  }

  // Use key to force remount when timeout changes (e.g., after settings update)
  return (
    <IdleTimerHandler key={timeoutMinutes} timeoutMinutes={timeoutMinutes} />
  );
}
