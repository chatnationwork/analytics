"use client";

import { CrmSettings } from "@/components/settings/CrmSettings";
import { RouteGuard } from "@/components/auth/RouteGuard";

export default function SettingsCrmPage() {
  return (
    <RouteGuard permission="settings.manage">
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-semibold text-foreground">
            CRM Integrations
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Connect and manage CRM integrations
          </p>
        </div>
        <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
          <CrmSettings />
        </div>
      </div>
    </RouteGuard>
  );
}
