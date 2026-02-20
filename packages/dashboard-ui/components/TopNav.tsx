"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  Filter,
  Route,
  Zap,
  MessageCircle,
  Briefcase,
  Activity,
  Inbox,
  BarChart2,
  Users,
  Contact,
  BookOpen,
  ShieldCheck,
  Key,
  Building2,
  Clock,
  Shield,
  UserCircle,
  Brain,
  FileText,
  Star,
  List,
  Lock,
  AlertTriangle,
  Megaphone,
  Store,
  Mic,
} from "lucide-react";
import { usePermission } from "@/components/auth/PermissionContext";
import { api } from "@/lib/api";

const SIDEBAR_COLLAPSED_KEY = "sidebar-collapsed";
const SIDEBAR_GROUPS_KEY = "sidebar-groups-open";

const navGroups = [
  {
    title: "",
    items: [
      { href: "/agent-inbox", label: "Inbox", icon: Inbox },
      {
        href: "/contacts",
        label: "Contacts",
        icon: Contact,
        permission: "contacts.view",
      },
      { href: "/team-management", label: "Team Management", icon: Users },
      { href: "/eos-events", label: "EOS Events", icon: Activity },
      { href: "/broadcast", label: "Broadcast", icon: Megaphone },
    ],
  },
  {
    title: "Analytics",
    items: [
      { href: "/overview", label: "Overview", icon: LayoutDashboard },
      { href: "/funnel", label: "Funnels", icon: Filter },
      { href: "/journey", label: "User Journeys", icon: Route },
      { href: "/journeys", label: "Self-Serve vs Assisted", icon: Zap },
      { href: "/whatsapp-analytics", label: "WhatsApp", icon: MessageCircle },
      { href: "/campaign-analytics", label: "Campaigns", icon: Briefcase },
      { href: "/agent-analytics", label: "Agent Analytics", icon: BarChart2 },
      {
        href: "/team-management/agent-status",
        label: "Agent Logs",
        icon: List,
        permission: "teams.manage",
      },
      { href: "/ai-analytics", label: "AI & Intents", icon: Brain },
      { href: "/wrap-up-analytics", label: "Wrap-up Reports", icon: FileText },
      { href: "/csat-analytics", label: "CSAT", icon: Star },
      { href: "/events", label: "Live Events", icon: Activity },
      { href: "/audit-logs", label: "Audit logs", icon: ShieldCheck },
    ],
  },

  {
    title: "Settings",
    items: [
      {
        href: "/settings/profile",
        label: "Profile",
        icon: UserCircle,
      },
      {
        href: "/settings/crm",
        label: "CRM Integrations",
        icon: Building2,
        permission: "settings.manage",
      },
      {
        href: "/settings/people",
        label: "Users",
        icon: Users,
        permission: "teams.manage",
      },
      {
        href: "/settings/session",
        label: "Session Management",
        icon: Clock,
        permission: "settings.manage",
      },
      {
        href: "/settings/roles",
        label: "Roles & Permissions",
        icon: Shield,
        permission: "settings.manage",
      },
      {
        href: "/settings/navigation",
        label: "Navigation labels",
        icon: List,
        permission: "settings.manage",
      },
      {
        href: "/settings/system-messages",
        label: "System messages",
        icon: MessageCircle,
        permission: "settings.manage",
      },
      {
        href: "/settings/templates",
        label: "Templates",
        icon: FileText,
        permission: "settings.manage",
      },
      {
        href: "/settings/security",
        label: "Security",
        icon: Lock,
      },
      {
        href: "/settings/danger-zone",
        label: "Danger Zone",
        icon: AlertTriangle,
        permission: "admin.danger_zone",
      },
    ],
  },
  {
    title: "System",
    items: [{ href: "/guides", label: "Docs", icon: BookOpen }],
  },
];

function loadGroupOpenState(): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(SIDEBAR_GROUPS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Record<string, boolean>;
      if (typeof parsed === "object" && parsed !== null) return parsed;
    }
  } catch {
    // ignore
  }
  return {};
}

function saveGroupOpenState(state: Record<string, boolean>) {
  try {
    localStorage.setItem(SIDEBAR_GROUPS_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

function getInitialCollapsed() {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "true";
}

export function TopNav() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(getInitialCollapsed);
  const [groupOpen, setGroupOpen] = useState<Record<string, boolean>>(() =>
    loadGroupOpenState(),
  );
  const { can, isLoading } = usePermission();
  const { data: tenant } = useQuery({
    queryKey: ["tenant"],
    queryFn: () => api.getCurrentTenant(),
  });
  const navLabels = tenant?.settings?.navLabels ?? {};
  const getLabel = (href: string, defaultLabel: string) =>
    (navLabels[href]?.trim() && navLabels[href]) || defaultLabel;

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next));
  };

  const toggleGroup = (title: string) => {
    setGroupOpen((prev) => {
      const next = { ...prev, [title]: !prev[title] };
      saveGroupOpenState(next);
      return next;
    });
  };

  const isGroupOpen = (title: string) => groupOpen[title] !== false;

  const filteredGroups = navGroups
    .map((group) => {
      const filteredItems = group.items.filter((item) => {
        const permission =
          "permission" in item && typeof item.permission === "string"
            ? item.permission
            : undefined;
        if (permission && !can(permission)) return false;
        if (
          item.label === "Team Management" &&
          !can("teams.manage") &&
          !can("teams.view_all") &&
          !can("teams.view_team")
        )
          return false;
        return true;
      });
      if (filteredItems.length === 0) return null;
      if (group.title === "Analytics" && !can("analytics.view")) return null;
      return { ...group, items: filteredItems };
    })
    .filter(Boolean) as typeof navGroups;

  if (isLoading) return null;

  return (
    <aside
      className={`
        shrink-0 flex flex-col bg-background border-r border-border
        transition-[width] duration-200 ease-in-out
        ${collapsed ? "w-[72px]" : "w-60"}
      `}
    >
      {/* Logo + Collapse Toggle */}
      <div
        className={`h-16 flex items-center justify-between border-b border-border ${
          collapsed ? "px-2 gap-1" : "px-3 gap-2"
        }`}
      >
        {!collapsed ? (
          <Link
            href="/overview"
            className="flex items-center gap-2.5 min-w-0 flex-1"
          >
            <div className="w-8 h-8 shrink-0 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
              S
            </div>
            <span className="font-semibold text-foreground truncate">
              Shuru Connect
            </span>
          </Link>
        ) : (
          <Link
            href="/overview"
            className="flex-1 flex justify-center"
            title="Analytics"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
              A
            </div>
          </Link>
        )}
        <button
          onClick={toggleCollapsed}
          className="shrink-0 p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <ChevronRight className="w-5 h-5" />
          ) : (
            <ChevronLeft className="w-5 h-5" />
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 overflow-y-auto">
        <div className="space-y-1 px-3">
          {filteredGroups.map((group, index) => {
            const open = collapsed ? true : isGroupOpen(group.title);
            return (
              <div
                key={group.title || `group-${index}`}
                className={index > 0 ? "mt-4" : ""}
              >
                {group.title && !collapsed ? (
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.title)}
                    className="flex items-center gap-2 w-full px-3 py-2.5 rounded-md text-xs font-semibold uppercase tracking-wider text-foreground/90 bg-muted/60 border border-border/80 hover:bg-muted transition-colors"
                  >
                    <ChevronDown
                      className={`w-4 h-4 shrink-0 transition-transform ${open ? "" : "-rotate-90"}`}
                    />
                    <span className="truncate">{group.title}</span>
                  </button>
                ) : null}
                {collapsed || open ? (
                  <div className="space-y-0.5">
                    {group.items.map((item) => {
                      const isActive =
                        pathname === item.href ||
                        pathname.startsWith(item.href + "/");
                      const Icon = item.icon;
                      const displayLabel = getLabel(item.href, item.label);
                      const linkContent = (
                        <>
                          <Icon
                            className={`w-5 h-5 shrink-0 ${collapsed ? "mx-auto" : ""}`}
                          />
                          {!collapsed && (
                            <span className="truncate">{displayLabel}</span>
                          )}
                        </>
                      );
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          title={collapsed ? displayLabel : undefined}
                          className={`
                            flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                            ${collapsed ? "justify-center" : ""}
                            ${
                              isActive
                                ? "bg-accent text-foreground"
                                : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                            }
                          `}
                        >
                          {linkContent}
                        </Link>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </nav>
    </aside>
  );
}
