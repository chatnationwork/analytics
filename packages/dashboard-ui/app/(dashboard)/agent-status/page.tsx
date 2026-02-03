"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Redirect legacy /agent-status to /team-management (Agent Status content lives there).
 */
export default function AgentStatusRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/team-management");
  }, [router]);
  return null;
}
