"use client";

import { NavigationLabelsSettings } from "@/components/settings/NavigationLabelsSettings";
import { RouteGuard } from "@/components/auth/RouteGuard";

export default function SettingsNavigationPage() {
  return (
    <RouteGuard permission="settings.manage">
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-semibold text-foreground">
            Navigation labels
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Change sidebar menu labels to fit your organisation
          </p>
        </div>
        <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
          <NavigationLabelsSettings />
        </div>
      </div>
    </RouteGuard>
  );
}
