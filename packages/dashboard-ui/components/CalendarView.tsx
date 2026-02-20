"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export interface CalendarItem {
  id: string;
  title: string;
  date: string;
  href?: string;
  status?: string;
  color?: string;
  /** Optional: e.g. "1.2k recipients" */
  subtitle?: string;
  /** Optional: extra meta for tooltip */
  meta?: string;
}

interface CalendarViewProps {
  /** Initial items to display (optional - use loadItemsForRange for dynamic loading) */
  items?: CalendarItem[];
  /** Called when the visible date range changes. Return items for that range. */
  loadItemsForRange?: (
    dateFrom: string,
    dateTo: string
  ) => Promise<CalendarItem[]>;
  /** Optional: custom class for the container */
  className?: string;
}

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  scheduled: "bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-300/50",
  running: "bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-400/50",
  completed: "bg-green-500/20 text-green-700 dark:text-green-300 border-green-400/50",
  failed: "bg-red-500/20 text-red-700 dark:text-red-300 border-red-400/50",
  cancelled: "bg-muted text-muted-foreground",
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  scheduled: "Scheduled",
  running: "Running",
  completed: "Completed",
  failed: "Failed",
  cancelled: "Cancelled",
};

function toDateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function CalendarView({
  items: initialItems = [],
  loadItemsForRange,
  className,
}: CalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(() => new Date());
  const [itemsByDate, setItemsByDate] = useState<Record<string, CalendarItem[]>>(
    () => {
      const map: Record<string, CalendarItem[]> = {};
      for (const item of initialItems) {
        if (!item.date) continue;
        const d = new Date(item.date);
        const key = toDateKey(d);
        if (!map[key]) map[key] = [];
        map[key].push(item);
      }
      return map;
    }
  );
  const [loading, setLoading] = useState(false);

  const fetchForMonth = useCallback(
    async (year: number, month: number) => {
      if (!loadItemsForRange) return;
      const from = new Date(year, month, 1);
      const to = new Date(year, month + 1, 0);
      setLoading(true);
      try {
        const items = await loadItemsForRange(
          from.toISOString().split("T")[0],
          to.toISOString().split("T")[0]
        );
        const map: Record<string, CalendarItem[]> = {};
        for (const item of items) {
          if (!item.date) continue;
          const d = new Date(item.date);
          const key = toDateKey(d);
          if (!map[key]) map[key] = [];
          map[key].push(item);
        }
        setItemsByDate((prev) => ({ ...prev, ...map }));
      } finally {
        setLoading(false);
      }
    },
    [loadItemsForRange]
  );

  useEffect(() => {
    fetchForMonth(currentMonth.getFullYear(), currentMonth.getMonth());
  }, [currentMonth.getFullYear(), currentMonth.getMonth(), fetchForMonth]);

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startPad = firstDay.getDay();
  const daysInMonth = lastDay.getDate();

  const weeks: (number | null)[][] = [];
  let week: (number | null)[] = [];
  for (let i = 0; i < startPad; i++) {
    week.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    week.push(d);
    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
  }
  if (week.length > 0) {
    while (week.length < 7) week.push(null);
    weeks.push(week);
  }

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <TooltipProvider delayDuration={200}>
      <Card className={cn("overflow-hidden", className)}>
        <div className="p-4 border-b flex items-center justify-between bg-muted/30">
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              setCurrentMonth(new Date(year, month - 1, 1))
            }
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h3 className="font-semibold text-lg">
            {currentMonth.toLocaleString("default", {
              month: "long",
              year: "numeric",
            })}
          </h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              setCurrentMonth(new Date(year, month + 1, 1))
            }
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="p-4 relative">
          {loading && (
            <div className="absolute inset-0 bg-background/60 flex items-center justify-center z-10 rounded-b-lg">
              <span className="text-sm text-muted-foreground">Loading...</span>
            </div>
          )}
          <table className="w-full border-collapse">
            <thead>
              <tr>
                {dayNames.map((d) => (
                  <th
                    key={d}
                    className="text-center p-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider"
                  >
                    {d}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {weeks.map((row, wi) => (
                <tr key={wi}>
                  {row.map((d, di) => {
                    const dateKey =
                      d !== null
                        ? toDateKey(new Date(year, month, d))
                        : null;
                    const dayItems = dateKey ? itemsByDate[dateKey] ?? [] : [];
                    const isToday =
                      d !== null &&
                      new Date().toDateString() ===
                        new Date(year, month, d).toDateString();

                    return (
                      <td
                        key={di}
                        className={cn(
                          "align-top border border-border p-1.5 min-h-[100px] w-[14.28%]",
                          d === null && "bg-muted/20"
                        )}
                      >
                        {d !== null && (
                          <>
                            <div
                              className={cn(
                                "text-sm font-medium mb-2 inline-flex items-center justify-center min-w-[24px] h-6 rounded-md",
                                isToday &&
                                  "bg-primary text-primary-foreground font-semibold"
                              )}
                            >
                              {d}
                            </div>
                            <div className="space-y-1">
                              {dayItems.slice(0, 4).map((item) => {
                                const statusLabel =
                                  STATUS_LABELS[item.status ?? ""] ?? item.status ?? "";
                                const tooltipContent = (
                                  <div className="text-left max-w-[220px] space-y-1">
                                    <div className="font-semibold">{item.title}</div>
                                    {statusLabel && (
                                      <div className="text-xs text-muted-foreground">
                                        Status: {statusLabel}
                                      </div>
                                    )}
                                    {item.subtitle && (
                                      <div className="text-xs flex items-center gap-1">
                                        <Users className="h-3 w-3" />
                                        {item.subtitle}
                                      </div>
                                    )}
                                    {item.meta && (
                                      <div className="text-xs text-muted-foreground">
                                        {item.meta}
                                      </div>
                                    )}
                                  </div>
                                );

                                const content = (
                                  <div
                                    className={cn(
                                      "block text-xs px-2 py-1.5 rounded-md border transition-colors",
                                      item.color ??
                                        STATUS_COLORS[item.status ?? ""] ??
                                        "bg-muted hover:bg-muted/80"
                                    )}
                                  >
                                    <div className="font-medium truncate">
                                      {item.title}
                                    </div>
                                    {item.subtitle && (
                                      <div className="text-[10px] opacity-80 mt-0.5 truncate">
                                        {item.subtitle}
                                      </div>
                                    )}
                                  </div>
                                );

                                const wrapped = item.href ? (
                                  <Link
                                    key={item.id}
                                    href={item.href}
                                    className="block hover:opacity-90 focus:ring-2 focus:ring-ring rounded-md"
                                  >
                                    {content}
                                  </Link>
                                ) : (
                                  <div key={item.id}>{content}</div>
                                );

                                return (
                                  <Tooltip key={item.id}>
                                    <TooltipTrigger asChild>
                                      {wrapped}
                                    </TooltipTrigger>
                                    <TooltipContent side="top" className="text-sm">
                                      {tooltipContent}
                                    </TooltipContent>
                                  </Tooltip>
                                );
                              })}
                              {dayItems.length > 4 && (
                                <div className="text-[10px] text-muted-foreground pl-1">
                                  +{dayItems.length - 4} more
                                </div>
                              )}
                            </div>
                          </>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </TooltipProvider>
  );
}
