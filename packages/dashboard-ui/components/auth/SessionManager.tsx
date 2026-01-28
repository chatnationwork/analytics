"use client";

import { useIdleTimer } from "react-idle-timer";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { fetchWithAuth, logout } from "@/lib/api";
import { useAuth } from "./AuthProvider";

/**
 * Inner component that handles the actual idle timer.
 * This is mounted only after settings are loaded, ensuring
 * the timeout value is correct from the start.
 */
function IdleTimerHandler({ timeoutMinutes }: { timeoutMinutes: number }) {
  const router = useRouter();
  const hasLoggedOut = useRef(false);

  useIdleTimer({
    onIdle: () => {
      // Prevent multiple logout calls
      if (hasLoggedOut.current) return;
      hasLoggedOut.current = true;

      console.log(`User idle for ${timeoutMinutes} minutes. Logging out...`);
      logout("idle");
      router.push("/login?reason=idle");
    },
    timeout: timeoutMinutes * 60 * 1000,
    throttle: 500,
  });

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

    fetchWithAuth("/tenants/current")
      .then((data) => {
        const timeout = data?.settings?.session?.inactivityTimeoutMinutes ?? 30;
        console.log(`[SessionManager] Inactivity timeout: ${timeout} minutes`);
        setTimeoutMinutes(timeout);
      })
      .catch((err) => {
        // Don't log or set timeout on session expired - user will be redirected
        if (err.message === "Session expired") {
          return;
        }
        console.error("[SessionManager] Failed to fetch settings:", err);
        // Use default timeout for authenticated users when fetch fails for other reasons
        setTimeoutMinutes(30);
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
