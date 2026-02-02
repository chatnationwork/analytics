"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import {
  ChevronLeft,
  ChevronRight,
  LogOut,
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
  Settings,
  ShieldCheck,
} from "lucide-react";
import { logoutAction } from "@/app/(auth)/login/actions";
import { usePermission } from "@/components/auth/PermissionContext";

const SIDEBAR_COLLAPSED_KEY = "sidebar-collapsed";

const navGroups = [
  {
    title: "Analytics",
    items: [
      { href: "/overview", label: "Overview", icon: LayoutDashboard },
      { href: "/funnel", label: "Funnels", icon: Filter },
      { href: "/journey", label: "Journey", icon: Route },
      { href: "/journeys", label: "Self-Serve", icon: Zap },
      { href: "/whatsapp-analytics", label: "WhatsApp", icon: MessageCircle },
      { href: "/whatsapp", label: "CRM", icon: Briefcase },
      { href: "/events", label: "Events", icon: Activity },
      { href: "/audit-logs", label: "Audit logs", icon: ShieldCheck },
    ],
  },
  {
    title: "Agent System",
    items: [
      { href: "/agent-inbox", label: "Inbox", icon: Inbox },
      { href: "/contacts", label: "Contacts", icon: Contact },
      { href: "/agent-status", label: "Agent Status", icon: Users },
      { href: "/agent-analytics", label: "Agent Analytics", icon: BarChart2 },
      { href: "/team-management", label: "Teams", icon: Users },
    ],
  },
  {
    title: "System",
    items: [
      { href: "/docs", label: "Docs", icon: BookOpen },
      { href: "/settings", label: "Settings", icon: Settings },
    ],
  },
];

export function TopNav() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const { can, isLoading } = usePermission();

  useEffect(() => {
    const stored = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
    if (stored !== null) {
      setCollapsed(stored === "true");
    }
  }, []);

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next));
  };

  const filteredGroups = navGroups
    .map((group) => {
      const filteredItems = group.items.filter((item) => {
        if (item.label === "Teams" && !can("teams.manage")) return false;
        return true;
      });
      if (filteredItems.length === 0) return null;
      if (group.title === "Analytics" && !can("analytics.view")) return null;
      return { ...group, items: filteredItems };
    })
    .filter(Boolean) as typeof navGroups;

  const handleLogout = async () => {
    localStorage.removeItem("accessToken");
    await logoutAction();
  };

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
              A
            </div>
            <span className="font-semibold text-foreground truncate">
              Analytics
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
        <div className="space-y-6 px-3">
          {filteredGroups.map((group) => (
            <div key={group.title}>
              {!collapsed && (
                <h3 className="px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider truncate">
                  {group.title}
                </h3>
              )}
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const isActive =
                    pathname === item.href ||
                    pathname.startsWith(item.href + "/");
                  const Icon = item.icon;
                  const linkContent = (
                    <>
                      <Icon
                        className={`w-5 h-5 shrink-0 ${collapsed ? "mx-auto" : ""}`}
                      />
                      {!collapsed && (
                        <span className="truncate">{item.label}</span>
                      )}
                    </>
                  );
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      title={collapsed ? item.label : undefined}
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
            </div>
          ))}
        </div>
      </nav>

      {/* Logout */}
      <div className="p-3 border-t border-border">
        <button
          onClick={handleLogout}
          title={collapsed ? "Logout" : undefined}
          className={`
            w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors
            ${collapsed ? "justify-center" : ""}
          `}
        >
          <LogOut className="w-5 h-5 shrink-0" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
}
