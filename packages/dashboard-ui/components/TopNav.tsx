"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X, LogOut, ChevronDown } from "lucide-react";
import { logoutAction } from "@/app/(auth)/login/actions";
import { usePermission } from "@/components/auth/PermissionContext";
import { useAuth } from "@/components/auth/AuthProvider";

const navGroups = [
  {
    title: "Analytics",
    items: [
      { href: "/overview", label: "Overview" },
      { href: "/funnel", label: "Funnels" },
      { href: "/journey", label: "Journey" },
      { href: "/journeys", label: "Self-Serve" },
      { href: "/whatsapp-analytics", label: "WhatsApp" },
      { href: "/whatsapp", label: "CRM" },
      { href: "/events", label: "Events" },
    ],
  },
  {
    title: "Agent System",
    items: [
      { href: "/agent-inbox", label: "Inbox" },
      { href: "/team-management", label: "Teams" },
    ],
  },
  {
    title: "System",
    items: [
      { href: "/docs", label: "Docs" },
      { href: "/settings", label: "Settings" },
    ],
  },
];

export function TopNav() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const { can, canTeam, isLoading } = usePermission();
  const { user } = useAuth();

  if (isLoading) return null; // Or skeleton

  // Define logic to filter groups
  const filteredGroups = navGroups
    .map((group) => {
      // 1. Filter items based on specific rules
      const filteredItems = group.items.filter((item) => {
        if (item.label === "Teams" && !can("teams.manage")) return false;
        // Add other item-specific guards here if needed
        return true;
      });

      // 2. If no items remain, hide the group
      if (filteredItems.length === 0) return null;

      // 3. Group-level guards
      if (group.title === "Analytics" && !can("analytics.view")) return null;

      // Return new group with filtered items
      return { ...group, items: filteredItems };
    })
    .filter(Boolean) as typeof navGroups;

  const handleLogout = async () => {
    localStorage.removeItem("accessToken");
    await logoutAction();
  };

  return (
    <header className="bg-background border-b border-border sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
              A
            </div>
            <span className="font-semibold text-foreground hidden sm:block">
              Analytics
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-4">
            {filteredGroups.map((group) => {
              // Check if any child is active
              const isGroupActive = group.items.some(
                (item) =>
                  pathname === item.href ||
                  pathname.startsWith(item.href + "/"),
              );

              return (
                <div
                  key={group.title}
                  className="relative"
                  onMouseEnter={() => setActiveDropdown(group.title)}
                  onMouseLeave={() => setActiveDropdown(null)}
                >
                  <button
                    className={`flex items-center gap-1 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                      isGroupActive
                        ? "text-foreground bg-accent"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                    }`}
                  >
                    {group.title}
                    <ChevronDown className="w-4 h-4" />
                  </button>

                  {activeDropdown === group.title && (
                    <div className="absolute top-full left-0 w-48 py-1 bg-popover border border-border rounded-lg shadow-md">
                      {group.items.map((item) => {
                        const isActive =
                          pathname === item.href ||
                          pathname.startsWith(item.href + "/");
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            className={`block px-4 py-2 text-sm ${
                              isActive
                                ? "text-foreground bg-accent"
                                : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                            }`}
                          >
                            {item.label}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>

          {/* User Menu */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleLogout}
              className="hidden md:flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-muted-foreground hover:text-foreground"
            >
              {mobileMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Nav */}
        {mobileMenuOpen && (
          <nav className="md:hidden py-4 border-t border-border max-h-[calc(100vh-4rem)] overflow-y-auto bg-background">
            <div className="space-y-4">
              {filteredGroups.map((group) => (
                <div key={group.title}>
                  <div className="px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {group.title}
                  </div>
                  <div className="space-y-1">
                    {group.items.map((item) => {
                      const isActive =
                        pathname === item.href ||
                        pathname.startsWith(item.href + "/");
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setMobileMenuOpen(false)}
                          className={`block px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                            isActive
                              ? "text-foreground bg-accent"
                              : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                          }`}
                        >
                          {item.label}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}

              <div className="pt-4 border-t border-border">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </div>
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}
