"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { overviewEnhancedApi } from "@/lib/overview-enhanced-api";
import { trendsApi, Granularity } from "@/lib/trends-api";
import { whatsappAnalyticsApi } from "@/lib/whatsapp-analytics-api";
import {
  TrendingUp,
  TrendingDown,
  Users,
  Clock,
  Target,
  BarChart3,
  UserCheck,
  Calendar,
} from "lucide-react";
import { RouteGuard } from "@/components/auth/RouteGuard";
import {
  TrendChart,
  StackedTrendChart,
  RateTrendChart,
} from "@/components/charts/TrendChart";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { WhatsAppHealthAlerts } from "@/components/whatsapp/WhatsAppHealthAlerts";

function getDefaultDateRange(): { start: string; end: string } {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 29);
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

export default function OverviewPage() {
  const [dateRange, setDateRange] = useState(getDefaultDateRange);
  const [granularity, setGranularity] = useState<Granularity>("day");

  const dateRangeDays = useMemo(() => {
    const start = new Date(dateRange.start).getTime();
    const end = new Date(dateRange.end).getTime();
    return Math.max(1, Math.ceil((end - start) / (24 * 60 * 60 * 1000)) + 1);
  }, [dateRange.start, dateRange.end]);

  const periods =
    granularity === "day"
      ? Math.min(365, dateRangeDays)
      : granularity === "week"
        ? Math.min(52, Math.ceil(dateRangeDays / 7))
        : Math.min(24, Math.ceil(dateRangeDays / 30));

  const { data: tenant } = useQuery({
    queryKey: ["tenant"],
    queryFn: () => api.getCurrentTenant(),
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ["overview", tenant?.tenantId, dateRange.start, dateRange.end],
    queryFn: () =>
      api.getOverview(tenant?.tenantId!, dateRange.start, dateRange.end),
    enabled: !!tenant?.tenantId,
  });

  const { data: pagePaths } = useQuery({
    queryKey: ["page-paths", tenant?.tenantId, dateRange.start, dateRange.end],
    queryFn: () =>
      api.getTopPagePaths(tenant?.tenantId!, dateRange.start, dateRange.end),
    enabled: !!tenant?.tenantId,
  });

  const { data: dailyUsers } = useQuery({
    queryKey: ["daily-users", tenant?.tenantId, dateRange.start, dateRange.end],
    queryFn: () =>
      overviewEnhancedApi.getDailyActiveUsers(
        tenant?.tenantId,
        dateRange.start,
        dateRange.end,
      ),
    enabled: !!tenant?.tenantId,
  });

  const { data: browsers } = useQuery({
    queryKey: [
      "browser-breakdown",
      tenant?.tenantId,
      dateRange.start,
      dateRange.end,
    ],
    queryFn: () =>
      overviewEnhancedApi.getBrowserBreakdown(
        tenant?.tenantId,
        dateRange.start,
        dateRange.end,
      ),
    enabled: !!tenant?.tenantId,
  });

  const { data: userIdentity } = useQuery({
    queryKey: [
      "user-identity",
      tenant?.tenantId,
      dateRange.start,
      dateRange.end,
    ],
    queryFn: () =>
      overviewEnhancedApi.getUserIdentityStats(
        tenant?.tenantId,
        dateRange.start,
        dateRange.end,
      ),
    enabled: !!tenant?.tenantId,
  });

  // Trends queries (periods derived from date range)
  const { data: sessionTrend } = useQuery({
    queryKey: ["session-trend", granularity, periods],
    queryFn: () => trendsApi.getSessionTrend(granularity, periods),
  });

  const { data: conversionTrend } = useQuery({
    queryKey: ["conversion-trend", granularity, periods],
    queryFn: () => trendsApi.getConversionTrend(granularity, periods),
  });

  const { data: userGrowthTrend } = useQuery({
    queryKey: ["user-growth-trend", granularity, periods],
    queryFn: () => trendsApi.getUserGrowthTrend(granularity, periods),
  });

  const { data: countries } = useQuery({
    queryKey: [
      "traffic-by-country",
      tenant?.tenantId,
      dateRange.start,
      dateRange.end,
    ],
    queryFn: () =>
      whatsappAnalyticsApi.getCountries(dateRange.start, dateRange.end),
    enabled: !!tenant?.tenantId,
  });

  const setRangeToLast = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - (days - 1));
    setDateRange({
      start: start.toISOString().slice(0, 10),
      end: end.toISOString().slice(0, 10),
    });
  };

  return (
    <RouteGuard permission="analytics.view">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Overview</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {dateRange.start === dateRange.end
                ? dateRange.start
                : `${dateRange.start} – ${dateRange.end}`}
            </p>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="flex items-center gap-2">
                <div className="flex flex-col gap-1">
                  <Label htmlFor="overview-start" className="text-xs">
                    From
                  </Label>
                  <Input
                    id="overview-start"
                    type="date"
                    value={dateRange.start}
                    onChange={(e) =>
                      setDateRange((prev) => ({
                        ...prev,
                        start: e.target.value,
                      }))
                    }
                    className="w-[140px] h-9"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <Label htmlFor="overview-end" className="text-xs">
                    To
                  </Label>
                  <Input
                    id="overview-end"
                    type="date"
                    value={dateRange.end}
                    onChange={(e) =>
                      setDateRange((prev) => ({
                        ...prev,
                        end: e.target.value,
                      }))
                    }
                    className="w-[140px] h-9"
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRangeToLast(7)}
                className="h-9"
              >
                7d
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRangeToLast(30)}
                className="h-9"
              >
                30d
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRangeToLast(90)}
                className="h-9"
              >
                90d
              </Button>
            </div>
          </div>
        </div>

        <WhatsAppHealthAlerts />

        {/* Loading */}

        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="bg-card rounded-xl border border-border p-5 animate-pulse"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="h-4 w-20 bg-muted rounded" />
                  <div className="h-4 w-4 bg-muted rounded" />
                </div>
                <div className="h-8 w-24 bg-muted rounded mb-2" />
                <div className="h-3 w-16 bg-muted rounded" />
              </div>
            ))}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg text-sm">
            Failed to load data. Ensure the API is running.
          </div>
        )}

        {/* Data */}
        {data && (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <StatCard
                label="Total Sessions"
                value={data.totalSessions?.toLocaleString() ?? "0"}
                icon={<BarChart3 className="w-4 h-4" />}
              />
              <StatCard
                label="Unique Users"
                value={data.totalUsers?.toLocaleString() ?? "0"}
                icon={<Users className="w-4 h-4" />}
              />
              <StatCard
                label="Completion Rate"
                value={`${((data.conversionRate ?? 0) * 100).toFixed(1)}%`}
                icon={<Target className="w-4 h-4" />}
              />
              <StatCard
                label="Avg Duration"
                value={formatDuration(data.avgSessionDuration ?? 0)}
                icon={<Clock className="w-4 h-4" />}
              />
              <StatCard
                label="Identified Users"
                value={`${(userIdentity?.identifiedPercent ?? 0).toFixed(0)}%`}
                change={`${userIdentity?.identified ?? 0} of ${userIdentity?.total ?? 0}`}
                positive
                icon={<UserCheck className="w-4 h-4" />}
              />
            </div>

            {/* Trends Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-foreground">
                  Trends
                </h2>
                <select
                  value={granularity}
                  onChange={(e) =>
                    setGranularity(e.target.value as Granularity)
                  }
                  className="bg-card border border-border rounded-lg px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  aria-label="Select time granularity"
                >
                  <option value="day">Daily</option>
                  <option value="week">Weekly</option>
                  <option value="month">Monthly</option>
                </select>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {/* Session Trend */}
                <TrendChart
                  title="Sessions Over Time"
                  data={
                    sessionTrend?.data?.map((d) => ({
                      period: toPeriodString(d.period),
                      value: d.count,
                    })) ?? []
                  }
                  summary={{
                    total: sessionTrend?.summary?.total,
                    percentChange: sessionTrend?.summary?.percentChange,
                    label: "vs previous period",
                  }}
                  valueLabel="sessions"
                  color="blue"
                />

                {/* Conversion Trend */}
                <RateTrendChart
                  title="Conversion Rate Trend"
                  data={
                    conversionTrend?.data?.map((d) => ({
                      period: toPeriodString(d.period),
                      rate: d.conversionRate * 100,
                      total: d.totalSessions,
                    })) ?? []
                  }
                  summary={{
                    overallRate:
                      conversionTrend?.summary?.overallConversionRate,
                    total: conversionTrend?.summary?.totalConversions,
                    label: `${conversionTrend?.summary?.totalConversions ?? 0} conversions`,
                  }}
                />
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {/* User Growth Trend */}
                <StackedTrendChart
                  title="User Growth"
                  data={(userGrowthTrend?.data ?? []).map((d) => ({
                    ...d,
                    period: toPeriodString(d.period),
                  }))}
                  summary={{
                    newUsers: userGrowthTrend?.summary?.totalNewUsers,
                    returningUsers:
                      userGrowthTrend?.summary?.totalReturningUsers,
                    newPercent: userGrowthTrend?.summary?.newUserPercent,
                  }}
                />

                {/* Daily Active Users (existing) */}
                <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
                  <h3 className="font-medium text-foreground mb-6">
                    Daily Active Users
                  </h3>
                  <DailyActiveUsersChart data={dailyUsers ?? []} />
                </div>
              </div>
            </div>

            {/* Charts Row: Device & Browser */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Device Breakdown */}
              <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
                <h3 className="font-medium text-foreground mb-6">
                  Traffic by Device
                </h3>
                <DeviceChart data={data?.deviceBreakdown} />
              </div>

              {/* Browser Breakdown */}
              <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
                <h3 className="font-medium text-foreground mb-6">
                  Top Browsers
                </h3>
                <BrowserChart data={browsers ?? []} />
              </div>
            </div>

            {/* Traffic by Journey */}
            <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
              <h3 className="font-medium text-foreground mb-6">
                Traffic by Journey
              </h3>
              <PagePathsChart data={pagePaths ?? []} />
            </div>

            {/* Traffic by Country */}
            <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
              <h3 className="font-medium text-foreground mb-6">
                Traffic by Country
              </h3>
              <CountryTable data={countries ?? []} />
            </div>

            {/* Activity Heatmap */}
            <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
              <h3 className="font-medium text-foreground mb-6">
                Activity by Hour
              </h3>
              <ActivityHeatmap data={data?.heatmap} />
            </div>
          </>
        )}
      </div>
    </RouteGuard>
  );
}

/** Ensure chart period is a string (backend may return Date). */
function toPeriodString(period: string | Date | unknown): string {
  if (typeof period === "string") return period;
  if (period instanceof Date) return period.toISOString();
  return String(period ?? "");
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${mins}m ${secs}s`;
}

function StatCard({
  label,
  value,
  change,
  positive,
  icon,
}: {
  label: string;
  value: string;
  change?: string;
  positive?: boolean;
  icon: React.ReactNode;
}) {
  return (
    <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <span className="text-muted-foreground text-sm">{label}</span>
        <div className="text-muted-foreground">{icon}</div>
      </div>
      <div className="text-2xl font-bold text-foreground mb-1">{value}</div>
      {change != null && (
        <div
          className={`text-sm flex items-center gap-1 ${positive ? "text-green-400" : "text-red-400"}`}
        >
          {positive ? (
            <TrendingUp className="w-3 h-3" />
          ) : (
            <TrendingDown className="w-3 h-3" />
          )}
          {change}
        </div>
      )}
    </div>
  );
}

function SessionsTrendChart({
  data,
}: {
  data: { date: string; count: number }[];
}) {
  if (!data?.length)
    return (
      <div className="h-48 flex items-center justify-center text-muted-foreground">
        No data available
      </div>
    );

  const max = Math.max(...data.map((d) => d.count)) || 1;

  return (
    <div className="h-48 flex items-end gap-1">
      {data.map((point, i) => {
        const height = (point.count / max) * 100;
        return (
          <div
            key={i}
            className="flex-1 flex flex-col items-center justify-end h-full min-h-0 group relative"
          >
            <div className="absolute bottom-full mb-2 bg-popover text-popover-foreground text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10 border border-border shadow-md">
              {point.date}: {point.count} sessions
            </div>
            <div
              className="w-full bg-gradient-to-t from-blue-500 to-blue-400 rounded-t hover:from-blue-400 hover:to-blue-300 transition-colors min-h-[2px] flex-shrink-0"
              style={{ height: `${height}%` }}
            />
          </div>
        );
      })}
    </div>
  );
}

function DeviceChart({ data }: { data: { device: string; count: number }[] }) {
  if (!data?.length)
    return (
      <div className="h-40 flex items-center justify-center text-gray-500">
        No data available
      </div>
    );

  const total = data.reduce((acc, curr) => acc + curr.count, 0);
  const colors = ["#3B82F6", "#8B5CF6", "#10B981", "#F59E0B", "#EF4444"]; // Blue, Purple, Green, Amber, Red

  let currentOffset = 0;
  const segments = data.map((item, i) => {
    const percentage = item.count / total;
    const dashArray = `${percentage * 251.2} 251.2`;
    const dashOffset = -currentOffset * 251.2;
    currentOffset += percentage;
    return {
      ...item,
      color: colors[i % colors.length],
      dashArray,
      dashOffset,
      percentage,
    };
  });

  return (
    <div className="flex items-center justify-center gap-8">
      <div className="relative w-40 h-40">
        <svg viewBox="0 0 100 100" className="transform -rotate-90">
          <circle
            cx="50"
            cy="50"
            r="40"
            fill="none"
            className="stroke-muted"
            strokeWidth="12"
          />
          {segments.map((seg, i) => (
            <circle
              key={i}
              cx="50"
              cy="50"
              r="40"
              fill="none"
              stroke={seg.color}
              strokeWidth="12"
              strokeDasharray={seg.dashArray}
              strokeDashoffset={seg.dashOffset}
            />
          ))}
        </svg>
        <div className="absolute inset-0 flex items-center justify-center flex-col">
          <div className="text-2xl font-bold text-foreground">
            {total.toLocaleString()}
          </div>
          <div className="text-xs text-muted-foreground">Total</div>
        </div>
      </div>
      <div className="space-y-3">
        {segments.map((seg, i) => (
          <div key={i} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: seg.color }}
            />
            <span className="text-sm text-muted-foreground">
              {seg.device} ({Math.round(seg.percentage * 100)}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ActivityHeatmap({
  data,
}: {
  data: { day: number; hour: number; count: number }[];
}) {
  // 0 = Sunday in SQL extract usually, adjust if needed based on Day of Week standard
  // Let's assume 0=Sun, 1=Mon...6=Sat.
  // We want display Mon(1) - Sun(0/7)
  // Map DOW to array index 0-6 where 0=Mon
  const mapDayToRow = (d: number) => (d === 0 ? 6 : d - 1);

  const max = Math.max(...data.map((d) => d.count)) || 1;
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const hours = ["12am", "4am", "8am", "12pm", "4pm", "8pm"];

  // Initialize 7x24 grid
  const grid = Array(7)
    .fill(0)
    .map(() => Array(24).fill(0));
  data.forEach((d) => {
    const row = mapDayToRow(d.day);
    if (row >= 0 && row < 7 && d.hour >= 0 && d.hour < 24) {
      grid[row][d.hour] = d.count;
    }
  });

  return (
    <div className="overflow-x-auto">
      <div className="flex gap-2 min-w-[600px]">
        <div className="flex flex-col gap-1 pr-2 text-xs text-muted-foreground pt-6">
          {days.map((d) => (
            <div key={d} className="h-6 flex items-center">
              {d}
            </div>
          ))}
        </div>
        <div className="flex-1">
          <div className="flex gap-1 mb-2 text-xs text-muted-foreground">
            {Array(24)
              .fill(0)
              .map((_, i) => (
                <div key={i} className="flex-1 text-center">
                  {i % 4 === 0
                    ? i === 0
                      ? "12am"
                      : i === 12
                        ? "12pm"
                        : i > 12
                          ? `${i - 12}pm`
                          : `${i}am`
                    : ""}
                </div>
              ))}
          </div>
          <div className="space-y-1">
            {grid.map((row, i) => (
              <div key={i} className="flex gap-1">
                {row.map((val, j) => (
                  <div
                    key={j}
                    className="flex-1 h-6 rounded hover:ring-1 hover:ring-white/50 transition-all relative group"
                    style={{
                      backgroundColor: `rgba(59, 130, 246, ${Math.max(0.1, val / max)})`,
                    }}
                  >
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 bg-popover text-popover-foreground text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10 border border-border shadow-md">
                      {days[i]} {j}:00 - {val} sessions
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function PagePathsChart({
  data,
}: {
  data: { pagePath: string; count: number; uniqueSessions: number }[];
}) {
  if (!data?.length) {
    return (
      <div className="h-32 flex items-center justify-center text-muted-foreground">
        No page path data available
      </div>
    );
  }

  const max = Math.max(...data.map((d) => d.count), 1);
  const total = data.reduce((acc, d) => acc + d.count, 0);

  return (
    <div className="space-y-2 max-h-80 overflow-y-auto">
      {data.map((item, i) => (
        <div key={item.pagePath} className="flex items-center gap-3 group">
          <div className="w-6 text-center font-medium text-gray-400 text-sm">
            {i + 1}
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <span
                className="text-sm text-foreground truncate max-w-[200px]"
                title={item.pagePath}
              >
                {item.pagePath || "/"}
              </span>
              <span className="text-xs text-muted-foreground">
                {item.count.toLocaleString()}{" "}
                <span className="text-muted-foreground/70">
                  ({((item.count / total) * 100).toFixed(1)}%)
                </span>
              </span>
            </div>
            <div className="h-2 bg-muted rounded overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded transition-all"
                style={{ width: `${(item.count / max) * 100}%` }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function DailyActiveUsersChart({
  data,
}: {
  data: { date: string; count: number }[];
}) {
  if (!data?.length)
    return (
      <div className="h-48 flex items-center justify-center text-muted-foreground">
        No data available
      </div>
    );

  const max = Math.max(...data.map((d) => d.count)) || 1;

  return (
    <div className="h-48 flex items-end gap-1">
      {data.map((point, i) => {
        const height = (point.count / max) * 100;
        const date = new Date(point.date).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        });
        return (
          <div
            key={i}
            className="flex-1 flex flex-col items-center justify-end h-full min-h-0 group relative"
          >
            <div className="absolute bottom-full mb-2 bg-popover text-popover-foreground text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10 border border-border shadow-md">
              {date}: {point.count} users
            </div>
            <div
              className="w-full bg-gradient-to-t from-green-500 to-green-400 rounded-t hover:from-green-400 hover:to-green-300 transition-colors min-h-[2px] flex-shrink-0"
              style={{ height: `${height}%` }}
            />
          </div>
        );
      })}
    </div>
  );
}

function BrowserChart({
  data,
}: {
  data: { browserName: string; count: number }[];
}) {
  if (!data?.length)
    return (
      <div className="h-40 flex items-center justify-center text-gray-500">
        No browser data
      </div>
    );

  const max = Math.max(...data.map((d) => d.count), 1);
  const total = data.reduce((acc, d) => acc + d.count, 0);
  const colors = [
    "#3B82F6",
    "#8B5CF6",
    "#10B981",
    "#F59E0B",
    "#EF4444",
    "#6366F1",
    "#EC4899",
    "#14B8A6",
  ];

  return (
    <div className="space-y-2">
      {data.slice(0, 6).map((item, i) => (
        <div key={item.browserName} className="flex items-center gap-3">
          <div className="w-6 text-center font-medium text-gray-400 text-sm">
            {i + 1}
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-foreground">
                {item.browserName}
              </span>
              <span className="text-xs text-muted-foreground">
                {item.count.toLocaleString()}{" "}
                <span className="text-muted-foreground/70">
                  ({((item.count / total) * 100).toFixed(1)}%)
                </span>
              </span>
            </div>
            <div className="h-2 bg-muted rounded overflow-hidden">
              <div
                className="h-full rounded transition-all"
                style={{
                  width: `${(item.count / max) * 100}%`,
                  backgroundColor: colors[i % colors.length],
                }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function CountryTable({
  data,
}: {
  data: { countryCode: string; count: number }[];
}) {
  if (!data?.length) {
    return (
      <div className="text-muted-foreground text-sm text-center py-8">
        No country data available
      </div>
    );
  }
  const total = data.reduce((acc, d) => acc + d.count, 0);
  return (
    <div className="space-y-2 max-h-64 overflow-y-auto">
      {data.slice(0, 10).map((item, i) => (
        <div
          key={item.countryCode}
          className="flex items-center gap-3 p-2 bg-muted/30 rounded"
        >
          <div className="w-6 text-center font-medium text-muted-foreground text-sm">
            {i + 1}
          </div>
          <div className="flex-1 font-medium text-foreground">
            {item.countryCode || "Unknown"}
          </div>
          <div className="text-sm text-muted-foreground">
            {item.count.toLocaleString()}{" "}
            <span className="text-muted-foreground/70">
              ({((item.count / total) * 100).toFixed(1)}%)
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
