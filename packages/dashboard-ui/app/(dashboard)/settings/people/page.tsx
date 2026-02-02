"use client";

import { useQuery } from "@tanstack/react-query";
import { TeamManagement } from "@/components/settings/team-management";
import { RouteGuard } from "@/components/auth/RouteGuard";
import { api } from "@/lib/api";

export default function SettingsPeoplePage() {
  const { data: tenant } = useQuery({
    queryKey: ["tenant"],
    queryFn: () => api.getCurrentTenant(),
  });

  return (
    <RouteGuard permission="teams.manage">
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-semibold text-foreground">People</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage workspace members and invitations
          </p>
        </div>
        <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
          <TeamManagement tenantId={tenant?.tenantId ?? ""} />
        </div>
      </div>
    </RouteGuard>
  );
}
