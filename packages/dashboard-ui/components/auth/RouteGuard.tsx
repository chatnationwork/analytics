"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { usePermission } from "@/components/auth/PermissionContext";
import { useAuth } from "@/components/auth/AuthProvider";

interface RouteGuardProps {
  children: React.ReactNode;
  /** Single permission required (user must have this). */
  permission?: string;
  /** Alternatively: user must have at least one of these permissions. */
  permissions?: string[];
  redirectTo?: string;
}

export function RouteGuard({
  children,
  permission,
  permissions,
  redirectTo = "/agent-inbox",
}: RouteGuardProps) {
  const { can, isLoading: permsLoading } = usePermission();
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const isLoading = permsLoading || authLoading;

  const allowed = (() => {
    if (permission) return can(permission);
    if (permissions && permissions.length > 0)
      return permissions.some((p) => can(p));
    return false;
  })();

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        console.warn(`Access denied. No user found. Redirecting to login...`);
        router.replace("/login");
        return;
      }
      if (!allowed) {
        console.warn(
          `Access denied. Missing required permission(s). Redirecting...`,
        );
        router.replace(redirectTo);
      }
    }
  }, [isLoading, user, allowed, router, redirectTo]);

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!allowed) {
    return null;
  }

  return <>{children}</>;
}
