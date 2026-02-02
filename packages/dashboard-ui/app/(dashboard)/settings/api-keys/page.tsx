"use client";

import { useQuery } from "@tanstack/react-query";
import { ApiKeySettings } from "@/components/settings/ApiKeySettings";
import { RouteGuard } from "@/components/auth/RouteGuard";
import { api } from "@/lib/api";

export default function SettingsApiKeysPage() {
  const { data: tenant } = useQuery({
    queryKey: ["tenant"],
    queryFn: () => api.getCurrentTenant(),
  });

  return (
    <RouteGuard permission="settings.manage">
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-semibold text-foreground">API Keys</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Create and manage API keys for your workspace
          </p>
        </div>
        <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
          <ApiKeySettings tenantId={tenant?.tenantId} />
        </div>
      </div>
    </RouteGuard>
  );
}
