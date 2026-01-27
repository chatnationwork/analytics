'use client';

import React, { ReactNode } from 'react';
import { usePermission } from '@/components/auth/PermissionContext';

interface PermissionGuardProps {
  children: ReactNode;
  permission?: string;
  teamPermission?: {
    permission: string;
    teamId: string;
  };
  fallback?: ReactNode;
}

export function PermissionGuard({ children, permission, teamPermission, fallback = null }: PermissionGuardProps) {
  const { can, canTeam, isLoading } = usePermission();

  if (isLoading) return null; // Or some loading state if needed, but usually null is safer to avoid flashes

  let hasAccess = true;

  // Check global permission
  if (permission && !can(permission)) {
    hasAccess = false;
  }

  // Check team permission
  if (teamPermission && !canTeam(teamPermission.permission, teamPermission.teamId)) {
    hasAccess = false;
  }

  if (!hasAccess) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
