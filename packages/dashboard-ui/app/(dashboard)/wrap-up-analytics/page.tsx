"use client";

/**
 * Wrap-up Reports Analytics – resolution categories and wrap-up outcomes.
 * Uses agent-inbox-analytics resolution by category and trend.
 */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  getResolutionOverview,
  getResolutionTrend,
  getResolutionByCategory,
  type Granularity,
  type ResolutionTrendDataPoint,
  type ResolutionCategoryItem,
} from "@/lib/agent-inbox-analytics-api";
import { CheckCircle, TrendingUp, FileText } from "lucide-react";
import { RouteGuard } from "@/components/auth/RouteGuard";

function formatDate(d: string) {
  return new Date(d).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function StatCard({
  label,
  value,
  change,
  icon,
}: {
  label: string;
  value: string | number;
  change?: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <span className="text-muted-foreground text-sm">{label}</span>
        {icon}
      </div>
      <div className="text-2xl font-bold text-foreground mb-1">{value}</div>
      {change && <div className="text-sm text-muted-foreground">{change}</div>}
    </div>
  );
}

function ResolutionTrendChart({ data }: { data: ResolutionTrendDataPoint[] }) {
  if (!data?.length) {
    return (
      <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
        No resolution data available
      </div>
    );
  }
  const maxCount = Math.max(...data.map((d) => d.resolvedCount), 1);
  return (
    <div className="h-48">
      <div className="h-full flex items-end gap-1">
        {data.map((point, i) => {
          const height = (point.resolvedCount / maxCount) * 100;
          const date = new Date(point.period);
          return (
            <div
              key={i}
              className="flex-1 flex flex-col items-center gap-1 group relative"
            >
              <div
                className="w-full bg-gradient-to-t from-green-600 to-green-400 rounded-t transition-all hover:from-green-500 hover:to-green-300"
                style={{ height: `${Math.max(height, 2)}%` }}
              />
              <div className="absolute bottom-full mb-2 hidden group-hover:block bg-popover text-popover-foreground text-xs p-2 rounded shadow-lg whitespace-nowrap z-10">
                <div className="font-medium">
                  {point.resolvedCount} resolved
                </div>
                <div className="text-muted-foreground">
                  {date.toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex justify-between mt-2 text-xs text-muted-foreground">
        <span>{formatDate(data[0]?.period)}</span>
        <span>{formatDate(data[data.length - 1]?.period)}</span>
      </div>
    </div>
  );
}

function CategoryBreakdown({ data }: { data: ResolutionCategoryItem[] }) {
  if (!data?.length) {
    return (
      <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
        No category data available
      </div>
    );
  }
  const formatCategory = (category: string) =>
    category.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  const colors = [
    "bg-green-500",
    "bg-blue-500",
    "bg-purple-500",
    "bg-amber-500",
    "bg-pink-500",
    "bg-cyan-500",
    "bg-orange-500",
  ];
  return (
    <div className="space-y-3">
      {data.slice(0, 7).map((item, i) => (
        <div key={item.category}>
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-foreground">
              {formatCategory(item.category)}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">{item.count}</span>
              <span className="text-foreground font-medium w-12 text-right">
                {item.percentage.toFixed(1)}%
              </span>
            </div>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full ${colors[i % colors.length]} rounded-full transition-all duration-500`}
              style={{ width: `${item.percentage}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function WrapUpAnalyticsPage() {
  const [granularity, setGranularity] = useState<Granularity>("day");
  const periods = granularity === "day" ? 30 : granularity === "week" ? 12 : 12;

  const { data: overview } = useQuery({
    queryKey: ["wrap-up-overview", granularity, periods],
    queryFn: () => getResolutionOverview(granularity, periods),
  });

  const { data: trend } = useQuery({
    queryKey: ["wrap-up-trend", granularity, periods],
    queryFn: () => getResolutionTrend(granularity, periods),
  });

  const { data: byCategory } = useQuery({
    queryKey: ["wrap-up-by-category", granularity, periods],
    queryFn: () => getResolutionByCategory(granularity, periods),
  });

  return (
    <RouteGuard permission="analytics.view">
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-semibold text-foreground">
            Wrap-up Reports
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Resolution categories and wrap-up outcomes
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard
            label="Total Resolved"
            value={overview?.totalResolved?.toLocaleString() ?? "0"}
            change={
              overview?.percentChange != null
                ? `${overview.percentChange >= 0 ? "+" : ""}${overview.percentChange.toFixed(1)}% vs previous`
                : undefined
            }
            icon={<CheckCircle className="w-4 h-4 text-muted-foreground" />}
          />
          <StatCard
            label="Unique Agents"
            value={overview?.uniqueAgents?.toLocaleString() ?? "0"}
            icon={<TrendingUp className="w-4 h-4 text-muted-foreground" />}
          />
          <StatCard
            label="Unique Sessions"
            value={overview?.uniqueSessions?.toLocaleString() ?? "0"}
            icon={<FileText className="w-4 h-4 text-muted-foreground" />}
          />
        </div>

        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Trends</h2>
          <select
            value={granularity}
            onChange={(e) => setGranularity(e.target.value as Granularity)}
            className="bg-card border border-border rounded-lg px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            aria-label="Select time granularity"
          >
            <option value="day">Daily</option>
            <option value="week">Weekly</option>
            <option value="month">Monthly</option>
          </select>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
            <h3 className="font-medium text-foreground mb-6">
              Resolutions Over Time
            </h3>
            <ResolutionTrendChart data={trend?.data ?? []} />
          </div>
          <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
            <h3 className="font-medium text-foreground mb-6">
              Resolution by Category
            </h3>
            <CategoryBreakdown data={byCategory?.data ?? []} />
          </div>
        </div>
      </div>
    </RouteGuard>
  );
}
