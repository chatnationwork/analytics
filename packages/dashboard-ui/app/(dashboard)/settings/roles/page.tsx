"use client";

import { useQuery } from "@tanstack/react-query";
import { RolesSettings } from "@/components/settings/RolesSettings";
import { RouteGuard } from "@/components/auth/RouteGuard";
import { api } from "@/lib/api";

export default function SettingsRolesPage() {
  const { data: tenant } = useQuery({
    queryKey: ["tenant"],
    queryFn: () => api.getCurrentTenant(),
  });

  return (
    <RouteGuard permission="settings.manage">
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-semibold text-foreground">
            Roles & Permissions
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Define roles and their permissions
          </p>
        </div>
        <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
          <RolesSettings tenantId={tenant?.tenantId} />
        </div>
      </div>
    </RouteGuard>
  );
}
