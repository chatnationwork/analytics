"use client";

import React from "react";
import { Activity, Store, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

export type EosTab = "events" | "speakers-exhibitors" | "engagements";

interface TabsNavProps {
  activeTab: EosTab;
  onTabChange: (tab: EosTab) => void;
}

const tabs: { id: EosTab; label: string; icon: any }[] = [
  { id: "events", label: "Events", icon: Activity },
  { id: "speakers-exhibitors", label: "Speakers & Exhibitors", icon: Store },
  { id: "engagements", label: "Engagements", icon: Zap },
];

export function TabsNav({ activeTab, onTabChange }: TabsNavProps) {
  return (
    <div className="flex items-center space-x-1 border-b border-border pb-px">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors -mb-[2px]",
              isActive
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
            )}
          >
            <Icon className="w-4 h-4" />
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
