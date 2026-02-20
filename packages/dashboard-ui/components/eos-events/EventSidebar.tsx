"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Ticket,
  Store,
  Mic,
  UserCheck,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarItem {
  label: string;
  icon: React.ElementType;
  href: string;
  exact?: boolean;
}

interface EventSidebarProps {
  eventId: string;
}

export function EventSidebar({ eventId }: EventSidebarProps) {
  const pathname = usePathname();

  const items: SidebarItem[] = [
    {
      label: "Overview",
      icon: LayoutDashboard,
      href: `/eos-events/${eventId}`,
      exact: true,
    },
    {
      label: "Tickets",
      icon: Ticket,
      href: `/eos-events/${eventId}/tickets`,
    },
    {
      label: "Exhibitors",
      icon: Store,
      href: `/eos-events/${eventId}/exhibitors`,
    },
    {
      label: "Speakers",
      icon: Mic,
      href: `/eos-events/${eventId}/speakers`,
    },
    {
      label: "Check-ins",
      icon: UserCheck,
      href: `/eos-events/${eventId}/check-ins`,
    },
    {
      label: "Settings",
      icon: Settings,
      href: `/eos-events/${eventId}/settings`,
    },
  ];

  return (
    <aside className="w-64 shrink-0 hidden md:block">
      <nav className="flex flex-col space-y-1">
        {items.map((item) => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-accent text-accent-foreground font-semibold"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
              )}
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
