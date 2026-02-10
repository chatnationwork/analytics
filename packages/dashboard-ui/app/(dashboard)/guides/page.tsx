/**
 * Permission-aware documentation landing page.
 * Displays doc category cards filtered by the current user's permissions.
 * Each category links to a dedicated guide page gated by PermissionGuard.
 */
"use client";

import Link from "next/link";
import {
  Inbox,
  Users,
  Settings,
  Code,
  BookOpen,
  ChevronRight,
} from "lucide-react";
import { usePermission } from "@/components/auth/PermissionContext";

/** Represents a documentation category card shown on the landing page */
interface DocCategory {
  title: string;
  description: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  /** If set, the user must have this permission to see the card. Null = always visible. */
  permission: string | null;
  items: string[];
}

/** All available documentation categories, ordered by audience breadth */
const DOC_CATEGORIES: DocCategory[] = [
  {
    title: "Getting Started",
    description: "Learn the basics of navigating the platform",
    href: "/guides",
    icon: BookOpen,
    permission: null,
    items: [
      "Logging in and setting your status",
      "Navigating the dashboard",
      "Understanding your role",
    ],
  },
  {
    title: "Agent Guide",
    description: "Handle conversations, resolve cases, and support taxpayers",
    href: "/guides/agent",
    icon: Inbox,
    permission: "docs.agent",
    items: [
      "Inbox overview",
      "Accepting and resolving chats",
      "Transfers and wrap-up",
      "CSAT and re-engagement",
    ],
  },
  {
    title: "Supervisor Guide",
    description:
      "Manage teams, monitor performance, and handle queue operations",
    href: "/guides/supervisor",
    icon: Users,
    permission: "docs.supervisor",
    items: [
      "Team management",
      "Queue stats and bulk actions",
      "Agent analytics and logs",
      "Wrap-up reports",
    ],
  },
  {
    title: "Admin Guide",
    description: "Configure settings, manage users, and review audit trails",
    href: "/guides/admin",
    icon: Settings,
    permission: "docs.admin",
    items: [
      "API keys and CRM integrations",
      "User and role management",
      "Audit logs",
      "Campaigns and system messages",
    ],
  },
  {
    title: "Developer Docs",
    description:
      "Integrate analytics using the SDK, REST API, and webhooks",
    href: "/docs",
    icon: Code,
    permission: "docs.developer",
    items: [
      "JavaScript SDK",
      "REST API reference",
      "WhatsApp integration",
      "AI event tracking",
    ],
  },
];

export default function DashboardDocsPage() {
  const { can } = usePermission();

  /** Filter categories by checking permission (null = always show) */
  const visibleCategories = DOC_CATEGORIES.filter(
    (cat) => cat.permission === null || can(cat.permission),
  );

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Help &amp; Documentation
        </h1>
        <p className="text-muted-foreground text-lg">
          Guides and references tailored to your role. Select a category below.
        </p>
      </div>

      {/* Category Cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {visibleCategories.map((cat) => {
          const Icon = cat.icon;
          const isExternal =
            cat.permission === "docs.developer";

          return (
            <Link
              key={cat.title}
              href={cat.href}
              {...(isExternal ? { target: "_blank" } : {})}
              className="group block bg-card rounded-xl border border-border p-6 hover:border-primary/50 hover:shadow-md transition-all"
            >
              <div className="flex items-start gap-4 mb-4">
                <div className="p-2.5 bg-primary/10 rounded-lg text-primary shrink-0">
                  <Icon className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h2 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                    {cat.title}
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    {cat.description}
                  </p>
                </div>
              </div>

              <ul className="space-y-2 mb-4">
                {cat.items.map((item) => (
                  <li
                    key={item}
                    className="flex items-center gap-2 text-sm text-muted-foreground"
                  >
                    <ChevronRight className="w-3.5 h-3.5 shrink-0 text-muted-foreground/50" />
                    {item}
                  </li>
                ))}
              </ul>

              <span className="text-sm font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                {isExternal ? "Open docs →" : "View guide →"}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
