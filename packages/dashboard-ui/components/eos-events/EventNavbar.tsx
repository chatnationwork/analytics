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
  Send,
  BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavbarItem {
  label: string;
  icon: React.ElementType;
  href: string;
  exact?: boolean;
}

interface EventNavbarProps {
  eventId: string;
}

export function EventNavbar({ eventId }: EventNavbarProps) {
  const pathname = usePathname();

  const items: NavbarItem[] = [
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
      label: "Venue",
      icon: LayoutDashboard, // Will use a better icon if possible, but keeping consistent for now
      href: `/eos-events/${eventId}/venue`,
    },
    {
      label: "Invitations",
      icon: Send,
      href: `/eos-events/${eventId}/invitations`, // We might need to create this page or redirect
    },
    {
      label: "Engagement",
      icon: BarChart3,
      href: `/eos-events/${eventId}/engagement`,
    },
    {
      label: "Analytics",
      icon: BarChart3,
      href: `/eos-events/${eventId}/analytics`,
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
    <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40">
      <div className="max-w-[1400px] mx-auto overflow-x-auto no-scrollbar">
        <nav className="flex items-center px-4 h-14 gap-2 min-w-max">
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
                  "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all shrink-0",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/50",
                )}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
