'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth/AuthProvider';
import { usePermission } from '@/components/auth/PermissionContext';

export default function DashboardPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { can, isLoading: permsLoading } = usePermission();
  const router = useRouter();

  useEffect(() => {
    if (authLoading || permsLoading) return;

    if (!user) {
      router.replace('/login');
      return;
    }

    if (can('analytics.view')) {
      router.replace('/overview');
    } else if (can('session.view')) {
      router.replace('/agent-inbox');
    } else if (can('settings.manage')) {
      router.replace('/settings');
    } else {
        // Fallback for users with literally no permissions
        // Maybe redirect to a 'profile' page if it existed, or just stay here?
        // Staying here shows nothing (empty page).
    }
  }, [user, authLoading, permsLoading, can, router]);

  if (authLoading || permsLoading) {
    return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
    );
  }

  // Fallback UI
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center text-gray-400">
        <div className="text-center">
             <h2 className="text-xl font-semibold mb-2">Welcome, {user?.name}</h2>
             <p>Select an section from the menu to continue.</p>
        </div>
    </div>
  );
}
