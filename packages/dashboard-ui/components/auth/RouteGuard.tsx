'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usePermission } from '@/components/auth/PermissionContext';
import { useAuth } from '@/components/auth/AuthProvider';

interface RouteGuardProps {
  children: React.ReactNode;
  permission: string;
  redirectTo?: string;
}

export function RouteGuard({ children, permission, redirectTo = '/agent-inbox' }: RouteGuardProps) {
  const { can, isLoading: permsLoading } = usePermission();
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const isLoading = permsLoading || authLoading;

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
         // Should be handled by layout/middleware, but safe double check
         return; 
      }
      
      if (!can(permission)) {
        console.warn(`Access denied. Missing permission: ${permission}. Redirecting...`);
        router.replace(redirectTo);
      }
    }
  }, [isLoading, user, can, permission, router, redirectTo]);

  if (isLoading) {
      return (
          <div className="flex h-[50vh] items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
      );
  }

  if (!can(permission)) {
      return null; // Return null while redirecting
  }

  return <>{children}</>;
}
