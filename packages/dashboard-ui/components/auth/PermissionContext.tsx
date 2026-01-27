'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import { User } from '@/lib/auth-client';
import { useAuth } from './AuthProvider';

interface PermissionContextType {
  can: (permission: string) => boolean;
  canTeam: (permission: string, teamId: string) => boolean;
  isLoading: boolean;
}

const PermissionContext = createContext<PermissionContextType | undefined>(undefined);

export function PermissionProvider({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth(); // We need to verify where useAuth comes from

  const can = (permission: string): boolean => {
    if (!user || !user.permissions?.global) return false;
    return user.permissions.global.includes(permission);
  };

  const canTeam = (permission: string, teamId: string): boolean => {
    if (!user || !user.permissions?.team?.[teamId]) return false;
    return user.permissions.team[teamId].includes(permission);
  };

  return (
    <PermissionContext.Provider value={{ can, canTeam, isLoading }}>
      {children}
    </PermissionContext.Provider>
  );
}

export function usePermission() {
  const context = useContext(PermissionContext);
  if (context === undefined) {
    throw new Error('usePermission must be used within a PermissionProvider');
  }
  return context;
}

/**
 * Convenience hooks
 */
export function useCan(permission: string) {
    const { can } = usePermission();
    return can(permission);
}

export function useCanTeam(permission: string, teamId: string) {
    const { canTeam } = usePermission();
    return canTeam(permission, teamId);
}
