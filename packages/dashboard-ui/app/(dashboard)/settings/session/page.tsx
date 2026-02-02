"use client";

import { useQuery } from "@tanstack/react-query";
import { SessionSettings } from "@/components/settings/SessionSettings";
import { RouteGuard } from "@/components/auth/RouteGuard";
import { api } from "@/lib/api";

export default function SettingsSessionPage() {
  const { data: tenant } = useQuery({
    queryKey: ["tenant"],
    queryFn: () => api.getCurrentTenant(),
  });

  return (
    <RouteGuard permission="settings.manage">
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Session</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Session duration and inactivity settings
          </p>
        </div>
        <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
          <SessionSettings tenantId={tenant?.tenantId ?? ""} />
        </div>
      </div>
    </RouteGuard>
  );
}
