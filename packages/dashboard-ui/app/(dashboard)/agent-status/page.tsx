"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Redirect legacy /agent-status to /team-management/agent-status.
 */
export default function AgentStatusRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/team-management/agent-status");
  }, [router]);
  return null;
}
