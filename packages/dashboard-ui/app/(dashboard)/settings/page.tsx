"use client";

import Link from "next/link";
import { usePermission } from "@/components/auth/PermissionContext";
import { Key, Building2, Users, Clock, Shield } from "lucide-react";

const settingsSections = [
  {
    href: "/settings/api-keys",
    label: "API Keys",
    icon: Key,
    permission: "settings.manage" as const,
  },
  {
    href: "/settings/crm",
    label: "CRM Integrations",
    icon: Building2,
    permission: "settings.manage" as const,
  },
  {
    href: "/settings/people",
    label: "People",
    icon: Users,
    permission: "teams.manage" as const,
  },
  {
    href: "/settings/session",
    label: "Session",
    icon: Clock,
    permission: "settings.manage" as const,
  },
  {
    href: "/settings/roles",
    label: "Roles & Permissions",
    icon: Shield,
    permission: "settings.manage" as const,
  },
];

export default function SettingsPage() {
  const { can, isLoading } = usePermission();
  const sections = settingsSections.filter((s) => can(s.permission));

  if (isLoading) return null;

  if (sections.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        You do not have access to any settings.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Manage your workspace configuration
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sections.map((section) => {
          const Icon = section.icon;
          return (
            <Link
              key={section.href}
              href={section.href}
              className="flex items-center gap-4 rounded-xl border border-border bg-card p-6 shadow-sm transition-colors hover:bg-accent/50"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-medium text-foreground">{section.label}</h2>
                <p className="text-sm text-muted-foreground">
                  {section.href === "/settings/people"
                    ? "Members & invitations"
                    : `Manage ${section.label.toLowerCase()}`}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
