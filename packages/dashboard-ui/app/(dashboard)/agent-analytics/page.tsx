"use client";

/**
 * =============================================================================
 * AGENT ANALYTICS PAGE
 * =============================================================================
 *
 * Dashboard page for agent analytics.
 * Shows resolution, transfer, agent performance, and team metrics.
 */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

function toYYYYMMDD(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function formatDateRangeLabel(start: string, end: string): string {
  const startD = new Date(start + "T00:00:00");
  const endD = new Date(end + "T00:00:00");
  const opts: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    year: "numeric",
  };
  if (start === end) return startD.toLocaleDateString("en-US", opts);
  return `${startD.toLocaleDateString("en-US", opts)} – ${endD.toLocaleDateString("en-US", opts)}`;
}

function toPeriodString(period: string | Date | unknown): string {
  if (typeof period === "string") return period;
  if (period instanceof Date) return period.toISOString();
  return String(period ?? "");
}

const PRESETS = [
  { label: "Today", days: 0 },
  { label: "Last 7 days", days: 7 },
  { label: "Last 30 days", days: 30 },
  { label: "Last 90 days", days: 90 },
] as const;
import {
  CheckCircle,
  ArrowRightLeft,
  AlertTriangle,
  Users,
  TrendingUp,
  TrendingDown,
  Inbox,
  Award,
  Activity,
  BarChart3,
  Target,
  Send,
} from "lucide-react";
import { RouteGuard } from "@/components/auth/RouteGuard";
import {
  getDashboardStats,
  getResolutionTrend,
  getResolutionByCategory,
  getTransferTrend,
  getTransferByReason,
  getAgentLeaderboard,
  getAgentActivity,
  getAgentDetailedStats,
  getAgentWorkload,
  getAgentPerformanceMetrics,
  getReengagement,
  type Granularity,
  type ResolutionTrendDataPoint,
  type ResolutionCategoryItem,
  type TransferTrendDataPoint,
  type TransferReasonItem,
  type AgentLeaderboardItem,
  type AgentActivityDataPoint,
  type AgentDetailedItem,
} from "@/lib/agent-inbox-analytics-api";

// =============================================================================
// COMPONENTS
// =============================================================================

// Stat Card Component
function StatCard({
  label,
  value,
  subValue,
  change,
  positive,
  icon,
}: {
  label: string;
  value: string | number;
  subValue?: string;
  change?: number;
  positive?: boolean;
  icon?: React.ReactNode;
}) {
  const showChange = change !== undefined && !isNaN(change);
  const isPositive = positive ?? (change !== undefined ? change >= 0 : true);

  return (
    <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <span className="text-muted-foreground text-sm">{label}</span>
        {icon && <div className="text-muted-foreground">{icon}</div>}
      </div>
      <div className="text-2xl font-bold text-foreground mb-1">{value}</div>
      {subValue && (
        <div className="text-sm text-muted-foreground">{subValue}</div>
      )}
      {showChange && (
        <div
          className={`text-sm flex items-center gap-1 ${
            isPositive ? "text-green-500" : "text-red-500"
          }`}
        >
          {isPositive ? (
            <TrendingUp className="w-3 h-3" />
          ) : (
            <TrendingDown className="w-3 h-3" />
          )}
          {change >= 0 ? "+" : ""}
          {change.toFixed(1)}% vs previous
        </div>
      )}
    </div>
  );
}

// Resolution Trend Chart
function ResolutionTrendChart({ data }: { data: ResolutionTrendDataPoint[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-muted-foreground">
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
          const date = new Date(toPeriodString(point.period));
          return (
            <div
              key={toPeriodString(point.period) || i}
              className="flex-1 flex flex-col items-center justify-end h-full min-h-0 group relative"
            >
              <div
                className="w-full bg-gradient-to-t from-green-600 to-green-400 rounded-t transition-all hover:from-green-500 hover:to-green-300 min-h-[2px] flex-shrink-0"
                style={{ height: `${Math.max(height, 2)}%` }}
              />
              {/* Tooltip */}
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
        <span>
          {new Date(data[0]?.period).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
          })}
        </span>
        <span>
          {new Date(data[data.length - 1]?.period).toLocaleDateString(
            undefined,
            { month: "short", day: "numeric" },
          )}
        </span>
      </div>
    </div>
  );
}

// Transfer Trend Chart
function TransferTrendChart({ data }: { data: TransferTrendDataPoint[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-muted-foreground">
        No transfer data available
      </div>
    );
  }

  const maxCount = Math.max(...data.map((d) => d.transferCount), 1);

  return (
    <div className="h-48">
      <div className="h-full flex items-end gap-1">
        {data.map((point, i) => {
          const height = (point.transferCount / maxCount) * 100;
          const date = new Date(toPeriodString(point.period));
          return (
            <div
              key={toPeriodString(point.period) || i}
              className="flex-1 flex flex-col items-center justify-end h-full min-h-0 group relative"
            >
              <div
                className="w-full bg-gradient-to-t from-blue-600 to-blue-400 rounded-t transition-all hover:from-blue-500 hover:to-blue-300 min-h-[2px] flex-shrink-0"
                style={{ height: `${Math.max(height, 2)}%` }}
              />
              <div className="absolute bottom-full mb-2 hidden group-hover:block bg-popover text-popover-foreground text-xs p-2 rounded shadow-lg whitespace-nowrap z-10">
                <div className="font-medium">
                  {point.transferCount} transfers
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
        <span>
          {new Date(data[0]?.period).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
          })}
        </span>
        <span>
          {new Date(data[data.length - 1]?.period).toLocaleDateString(
            undefined,
            { month: "short", day: "numeric" },
          )}
        </span>
      </div>
    </div>
  );
}

// Category Breakdown Chart
function CategoryBreakdownChart({ data }: { data: ResolutionCategoryItem[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-muted-foreground">
        No category data available
      </div>
    );
  }

  const formatCategory = (category: string) => {
    return category.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  };

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

// Transfer Reason Chart
function TransferReasonChart({ data }: { data: TransferReasonItem[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-muted-foreground">
        No transfer reason data available
      </div>
    );
  }

  const colors = [
    "bg-blue-500",
    "bg-purple-500",
    "bg-amber-500",
    "bg-pink-500",
    "bg-cyan-500",
  ];

  return (
    <div className="space-y-3">
      {data.slice(0, 5).map((item, i) => (
        <div key={item.reason}>
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-foreground truncate max-w-[200px]">
              {item.reason}
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

// Agent Leaderboard
function AgentLeaderboard({ data }: { data: AgentLeaderboardItem[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        No agent data available
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {data.map((agent, i) => (
        <div
          key={agent.agentId}
          className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg"
        >
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center font-medium text-sm ${
              i === 0
                ? "bg-yellow-500/20 text-yellow-500"
                : i === 1
                  ? "bg-gray-400/20 text-gray-400"
                  : i === 2
                    ? "bg-amber-600/20 text-amber-600"
                    : "bg-muted text-muted-foreground"
            }`}
          >
            {i + 1}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-medium text-foreground truncate">
              {agent.agentName?.trim() || agent.agentId.slice(0, 8) + "…"}
            </div>
            <div className="text-xs text-muted-foreground">
              {agent.resolvedCount} resolved • {agent.transfersIn} received •{" "}
              {agent.transfersOut} transferred
            </div>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold text-green-500">
              {agent.resolvedCount}
            </div>
            <div className="text-xs text-muted-foreground">resolved</div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Chat Status Donut
function ChatStatusDonut({
  active,
  resolved,
  expired,
  unassigned,
}: {
  active: number;
  resolved: number;
  expired: number;
  unassigned: number;
}) {
  const total = active + resolved + expired + unassigned;
  if (total === 0) {
    return (
      <div className="h-40 flex items-center justify-center text-muted-foreground">
        No chat data
      </div>
    );
  }

  const segments = [
    { value: active, color: "#22c55e", label: "Active" },
    { value: resolved, color: "#3b82f6", label: "Resolved" },
    { value: expired, color: "#f59e0b", label: "Expired" },
    { value: unassigned, color: "#6b7280", label: "Unassigned" },
  ];

  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="flex items-center gap-6">
      <div className="relative">
        <svg width="140" height="140" viewBox="0 0 140 140">
          <circle
            cx="70"
            cy="70"
            r={radius}
            fill="none"
            className="stroke-muted"
            strokeWidth="16"
          />
          {segments.map((seg, i) => {
            const pct = (seg.value / total) * 100;
            const arc = (pct / 100) * circumference;
            const currentOffset = offset;
            offset += arc;
            if (seg.value === 0) return null;
            return (
              <circle
                key={i}
                cx="70"
                cy="70"
                r={radius}
                fill="none"
                stroke={seg.color}
                strokeWidth="16"
                strokeDasharray={`${arc} ${circumference}`}
                strokeDashoffset={-currentOffset}
                transform="rotate(-90 70 70)"
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-2xl font-bold text-foreground">{total}</div>
          <div className="text-xs text-muted-foreground">Total</div>
        </div>
      </div>
      <div className="space-y-2">
        {segments.map((seg) => (
          <div key={seg.label} className="flex items-center gap-2 text-sm">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: seg.color }}
            />
            <span className="text-muted-foreground">{seg.label}</span>
            <span className="font-medium text-foreground">{seg.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Agent Activity Chart
function AgentActivityChart({ data }: { data: AgentActivityDataPoint[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-muted-foreground">
        No activity data available
      </div>
    );
  }

  const maxAgents = Math.max(...data.map((d) => d.activeAgents), 1);

  return (
    <div className="h-48">
      <div className="h-full flex items-end gap-1">
        {data.map((point, i) => {
          const height = (point.activeAgents / maxAgents) * 100;
          const date = new Date(point.period);
          return (
            <div
              key={i}
              className="flex-1 flex flex-col items-center justify-end h-full min-h-0 group relative"
            >
              <div
                className="w-full bg-gradient-to-t from-purple-600 to-purple-400 rounded-t transition-all hover:from-purple-500 hover:to-purple-300 min-h-[2px] flex-shrink-0"
                style={{ height: `${Math.max(height, 2)}%` }}
              />
              <div className="absolute bottom-full mb-2 hidden group-hover:block bg-popover text-popover-foreground text-xs p-2 rounded shadow-lg whitespace-nowrap z-10">
                <div className="font-medium">
                  {point.activeAgents} active agents
                </div>
                <div className="text-muted-foreground">
                  {point.resolutions} resolved • {point.handoffs} handoffs
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
        <span>
          {new Date(data[0]?.period).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
          })}
        </span>
        <span>
          {new Date(data[data.length - 1]?.period).toLocaleDateString(
            undefined,
            { month: "short", day: "numeric" },
          )}
        </span>
      </div>
    </div>
  );
}

// Agent Details Table
function AgentDetailsTable({ data }: { data: AgentDetailedItem[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        No agent data available
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left text-xs font-medium text-muted-foreground py-3 px-2">
              Agent
            </th>
            <th className="text-right text-xs font-medium text-muted-foreground py-3 px-2">
              Resolved
            </th>
            <th className="text-right text-xs font-medium text-muted-foreground py-3 px-2">
              Received
            </th>
            <th className="text-right text-xs font-medium text-muted-foreground py-3 px-2">
              Transferred
            </th>
            <th className="text-right text-xs font-medium text-muted-foreground py-3 px-2">
              Total
            </th>
            <th className="text-right text-xs font-medium text-muted-foreground py-3 px-2">
              Resolution Rate
            </th>
          </tr>
        </thead>
        <tbody>
          {data.slice(0, 10).map((agent) => (
            <tr
              key={agent.agentId}
              className="border-b border-border/50 hover:bg-muted/30"
            >
              <td className="py-3 px-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center">
                    <Users className="w-3.5 h-3.5 text-muted-foreground" />
                  </div>
                  <span className="text-sm font-medium text-foreground truncate max-w-[140px]" title={agent.agentId}>
                    {agent.agentName?.trim() || agent.agentId.slice(0, 8) + "…"}
                  </span>
                </div>
              </td>
              <td className="text-right text-sm text-foreground py-3 px-2">
                {agent.resolvedCount}
              </td>
              <td className="text-right text-sm text-foreground py-3 px-2">
                {agent.handoffsReceived + agent.transfersIn}
              </td>
              <td className="text-right text-sm text-foreground py-3 px-2">
                {agent.transfersOut}
              </td>
              <td className="text-right text-sm font-medium text-foreground py-3 px-2">
                {agent.totalChatsHandled}
              </td>
              <td className="text-right py-3 px-2">
                <span
                  className={`text-sm font-medium ${
                    agent.resolutionRate >= 70
                      ? "text-green-500"
                      : agent.resolutionRate >= 50
                        ? "text-yellow-500"
                        : "text-red-500"
                  }`}
                >
                  {agent.resolutionRate.toFixed(0)}%
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// =============================================================================
// MAIN PAGE
// =============================================================================

export default function AgentAnalyticsPage() {
  const granularity: Granularity = "day";
  const periods = 30;

  const today = toYYYYMMDD(new Date());
  const defaultStart = (() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return toYYYYMMDD(d);
  })();
  const [dateStart, setDateStart] = useState(defaultStart);
  const [dateEnd, setDateEnd] = useState(today);
  const [preset, setPreset] = useState<number | null>(30);

  const applyPreset = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - (days || 0));
    setDateEnd(toYYYYMMDD(end));
    setDateStart(toYYYYMMDD(start));
    setPreset(days === 0 ? 0 : days === 7 ? 7 : days === 90 ? 90 : 30);
  };

  const dateRangeLabel = formatDateRangeLabel(dateStart, dateEnd);

  // Queries
  const { data: dashboard, isLoading: loadingDashboard } = useQuery({
    queryKey: [
      "agent-analytics-dashboard",
      granularity,
      periods,
      dateStart,
      dateEnd,
    ],
    queryFn: () => getDashboardStats(granularity, periods, dateStart, dateEnd),
  });

  const { data: resolutionTrend } = useQuery({
    queryKey: [
      "agent-analytics-resolution-trend",
      granularity,
      periods,
      dateStart,
      dateEnd,
    ],
    queryFn: () => getResolutionTrend(granularity, periods, dateStart, dateEnd),
  });

  const { data: resolutionByCategory } = useQuery({
    queryKey: [
      "agent-analytics-resolution-category",
      granularity,
      periods,
      dateStart,
      dateEnd,
    ],
    queryFn: () =>
      getResolutionByCategory(granularity, periods, dateStart, dateEnd),
  });

  const { data: transferTrend } = useQuery({
    queryKey: [
      "agent-analytics-transfer-trend",
      granularity,
      periods,
      dateStart,
      dateEnd,
    ],
    queryFn: () => getTransferTrend(granularity, periods, dateStart, dateEnd),
  });

  const { data: transferByReason } = useQuery({
    queryKey: [
      "agent-analytics-transfer-reason",
      granularity,
      periods,
      dateStart,
      dateEnd,
    ],
    queryFn: () =>
      getTransferByReason(granularity, periods, dateStart, dateEnd),
  });

  const { data: leaderboard } = useQuery({
    queryKey: [
      "agent-analytics-leaderboard",
      granularity,
      periods,
      dateStart,
      dateEnd,
    ],
    queryFn: () =>
      getAgentLeaderboard(granularity, periods, 10, dateStart, dateEnd),
  });

  const { data: agentActivity } = useQuery({
    queryKey: [
      "agent-analytics-activity",
      granularity,
      periods,
      dateStart,
      dateEnd,
    ],
    queryFn: () => getAgentActivity(granularity, periods, dateStart, dateEnd),
  });

  const { data: agentDetails } = useQuery({
    queryKey: [
      "agent-analytics-details",
      granularity,
      periods,
      dateStart,
      dateEnd,
    ],
    queryFn: () =>
      getAgentDetailedStats(granularity, periods, dateStart, dateEnd),
  });

  const { data: workload } = useQuery({
    queryKey: [
      "agent-analytics-workload",
      granularity,
      periods,
      dateStart,
      dateEnd,
    ],
    queryFn: () => getAgentWorkload(granularity, periods, dateStart, dateEnd),
  });

  const { data: performanceMetrics } = useQuery({
    queryKey: [
      "agent-analytics-performance-metrics",
      granularity,
      periods,
      dateStart,
      dateEnd,
    ],
    queryFn: () =>
      getAgentPerformanceMetrics(granularity, periods, dateStart, dateEnd),
  });

  const { data: reengagement } = useQuery({
    queryKey: ["agent-analytics-reengagement", dateStart, dateEnd],
    queryFn: () => getReengagement(dateStart, dateEnd),
  });

  return (
    <RouteGuard permission="analytics.view">
      <div className="space-y-6 p-6">
        {/* Header + date filter */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-foreground">
                Agent Analytics
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                {dateRangeLabel}
              </p>
            </div>
          </div>
          {/* Date range filter */}
          <div className="flex flex-wrap items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border">
            <span className="text-sm font-medium text-foreground">
              Date range
            </span>
            {PRESETS.map(({ label, days }) => (
              <button
                key={label}
                type="button"
                onClick={() => applyPreset(days)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  preset === days
                    ? "bg-primary text-primary-foreground"
                    : "bg-card border border-border text-foreground hover:bg-muted/50"
                }`}
              >
                {label}
              </button>
            ))}
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={dateStart}
                onChange={(e) => {
                  setDateStart(e.target.value);
                  setPreset(null);
                }}
                className="bg-card border border-border rounded-lg px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                aria-label="From date"
              />
              <span className="text-muted-foreground">to</span>
              <input
                type="date"
                value={dateEnd}
                onChange={(e) => {
                  setDateEnd(e.target.value);
                  setPreset(null);
                }}
                className="bg-card border border-border rounded-lg px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                aria-label="To date"
              />
            </div>
          </div>
        </div>

        {/* Stats Grid - Row 1 (Volume) */}
        {loadingDashboard ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div
                key={i}
                className="bg-card rounded-xl border border-border p-5 animate-pulse"
              >
                <div className="h-4 bg-muted rounded w-24 mb-3" />
                <div className="h-8 bg-muted rounded w-16 mb-2" />
                <div className="h-3 bg-muted rounded w-20" />
              </div>
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                label="Assigned Chats"
                value={performanceMetrics?.assigned ?? 0}
                subValue="total assigned in period"
                icon={<Inbox className="w-4 h-4" />}
              />
              <StatCard
                label="Active Chats"
                value={dashboard?.chats.active ?? 0}
                subValue="currently active"
                icon={<Activity className="w-4 h-4" />}
              />
              <StatCard
                label="Unassigned Chats"
                value={dashboard?.chats.unassigned ?? 0}
                subValue="currently in queue"
                icon={<AlertTriangle className="w-4 h-4" />}
              />
              <StatCard
                label="Resolved Chats"
                value={dashboard?.resolutions.total ?? 0}
                change={dashboard?.resolutions.percentChange}
                positive={(dashboard?.resolutions.percentChange ?? 0) >= 0}
                icon={<CheckCircle className="w-4 h-4" />}
              />
            </div>

            {/* Stats Grid - Row 2 (Performance) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                label="Avg Resolution Time"
                value={
                  performanceMetrics?.avgResolutionTimeMinutes != null
                    ? `${performanceMetrics.avgResolutionTimeMinutes} min`
                    : "—"
                }
                subValue="avg accept to resolve"
                positive={(performanceMetrics?.avgResolutionTimeMinutes ?? 0) < 30}
                icon={<Target className="w-4 h-4" />}
              />
              <StatCard
                label="Avg Wait Time"
                value={
                  performanceMetrics?.avgFirstResponseMinutes != null
                    ? `${performanceMetrics.avgFirstResponseMinutes} min`
                    : "—"
                }
                subValue="avg time to first response"
                positive={(performanceMetrics?.avgFirstResponseMinutes ?? 0) < 5}
                icon={<Activity className="w-4 h-4" />}
              />
              <StatCard
                label="Active Agents"
                value={dashboard?.agents.activeAgents ?? 0}
                subValue={`${(dashboard?.agents.avgResolutionsPerAgent ?? 0).toFixed(1)} avg resolutions`}
                icon={<Users className="w-4 h-4" />}
              />
              <StatCard
                label="Resolution Rate"
                value={`${(dashboard?.agents.resolutionRate ?? 0).toFixed(1)}%`}
                subValue={`${dashboard?.resolutions.total ?? 0} of ${dashboard?.agents.totalHandoffs ?? 0} chats`}
                positive={(dashboard?.agents.resolutionRate ?? 0) >= 70}
                icon={<Target className="w-4 h-4" />}
              />
            </div>
          </>
        )}

        {/* Charts Row 1 */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Resolution Trend */}
          <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-medium text-foreground">
                Resolutions Over Time
              </h3>
              {resolutionTrend?.summary && (
                <div className="text-sm text-muted-foreground">
                  Total:{" "}
                  <span className="text-foreground font-medium">
                    {resolutionTrend.summary.totalResolved}
                  </span>
                </div>
              )}
            </div>
            <ResolutionTrendChart data={resolutionTrend?.data ?? []} />
          </div>

          {/* Transfer Trend */}
          <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-medium text-foreground">
                Transfers Over Time
              </h3>
              {transferTrend?.summary && (
                <div className="text-sm text-muted-foreground">
                  Total:{" "}
                  <span className="text-foreground font-medium">
                    {transferTrend.summary.totalTransfers}
                  </span>
                </div>
              )}
            </div>
            <TransferTrendChart data={transferTrend?.data ?? []} />
          </div>
        </div>

        {/* Charts Row 2 */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Resolution Categories */}
          <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
            <h3 className="font-medium text-foreground mb-6">
              Resolution Categories
            </h3>
            <CategoryBreakdownChart data={resolutionByCategory?.data ?? []} />
          </div>

          {/* Transfer Reasons */}
          <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
            <h3 className="font-medium text-foreground mb-6">
              Transfer Reasons
            </h3>
            <TransferReasonChart data={transferByReason?.data ?? []} />
          </div>
        </div>

        {/* Charts Row 3 */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Chat Status */}
          <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
            <h3 className="font-medium text-foreground mb-6">
              Current Chat Status
            </h3>
            <ChatStatusDonut
              active={dashboard?.chats.active ?? 0}
              resolved={dashboard?.chats.resolved ?? 0}
              expired={dashboard?.chats.expired ?? 0}
              unassigned={dashboard?.chats.unassigned ?? 0}
            />
          </div>

          {/* Agent Activity Trend */}
          <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-purple-500" />
                <h3 className="font-medium text-foreground">Agent Activity</h3>
              </div>
              {agentActivity?.summary && (
                <div className="text-sm text-muted-foreground">
                  Peak:{" "}
                  <span className="text-foreground font-medium">
                    {agentActivity.summary.peakActiveAgents}
                  </span>
                </div>
              )}
            </div>
            <AgentActivityChart data={agentActivity?.data ?? []} />
          </div>
        </div>

        {/* Expired & Re-engagement Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Send className="w-5 h-5 text-foreground" />
            <h2 className="text-lg font-semibold text-foreground">
              Expired & Re-engagement
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Re-engagements sent"
              value={reengagement?.totalSent ?? 0}
              subValue={`in ${dateRangeLabel}`}
              icon={<Send className="w-4 h-4" />}
            />
            <StatCard
              label="Reply rate"
              value={`${(reengagement?.replyRate ?? 0).toFixed(1)}%`}
              subValue={`${reengagement?.repliedCount ?? 0} of ${reengagement?.totalSent ?? 0} replied`}
              positive={(reengagement?.replyRate ?? 0) >= 30}
              icon={<CheckCircle className="w-4 h-4" />}
            />
            <StatCard
              label="Avg time to reply"
              value={
                reengagement?.avgTimeToReplyMinutes != null
                  ? `${reengagement.avgTimeToReplyMinutes} min`
                  : "—"
              }
              subValue="when user replied"
              icon={<Activity className="w-4 h-4" />}
            />
            <StatCard
              label="Expired (now)"
              value={dashboard?.chats.expired ?? 0}
              subValue={`${(dashboard?.chats.expiredRate ?? 0).toFixed(1)}% of assigned`}
              positive={(dashboard?.chats.expiredRate ?? 0) <= 10}
              icon={<AlertTriangle className="w-4 h-4" />}
            />
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {/* Re-engagement by agent */}
            <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
              <h3 className="font-medium text-foreground mb-4">
                Re-engagements by agent
              </h3>
              {!reengagement?.byAgent?.length ? (
                <p className="text-sm text-muted-foreground py-4">
                  No re-engagements in this period
                </p>
              ) : (
                <div className="space-y-2">
                  {reengagement.byAgent.map((a) => (
                    <div
                      key={a.agentId}
                      className="flex items-center justify-between py-2 border-b border-border last:border-0"
                    >
                      <span className="font-medium text-foreground">
                        {a.agentName ?? a.agentId.slice(0, 8)}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {a.sent} sent · {a.replied} replied (
                        {a.replyRate.toFixed(0)}%)
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {/* Recent replies */}
            <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
              <h3 className="font-medium text-foreground mb-4">
                Recent replies after re-engagement
              </h3>
              {!reengagement?.recentReplies?.length ? (
                <p className="text-sm text-muted-foreground py-4">
                  No replies yet
                </p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {reengagement.recentReplies.map((r, i) => (
                    <div
                      key={i}
                      className="py-2 border-b border-border last:border-0"
                    >
                      <div className="text-sm text-muted-foreground">
                        Replied in{" "}
                        <span className="font-medium text-foreground">
                          {r.timeToReplyMinutes} min
                        </span>
                        {r.replyContent ? (
                          <>: &ldquo;{r.replyContent.slice(0, 60)}
                            {r.replyContent.length > 60 ? "…" : ""}&rdquo;</>
                        ) : (
                          <> ({r.replyType})</>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Agent Performance Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-foreground" />
            <h2 className="text-lg font-semibold text-foreground">
              Agent Performance
            </h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Chats still in Active at end of day or shift count as Unresolved for
            performance tracking.
          </p>

          {/* Performance metrics: Assigned, Resolved, Unresolved, Expired, 1st Response, Resolution time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            <StatCard
              label="Assigned"
              value={performanceMetrics?.assigned ?? 0}
              subValue="chats assigned in period"
              icon={<Inbox className="w-4 h-4" />}
            />
            <StatCard
              label="Resolved"
              value={performanceMetrics?.resolved ?? 0}
              subValue="chats resolved in period"
              icon={<CheckCircle className="w-4 h-4" />}
            />
            <StatCard
              label="Unresolved"
              value={performanceMetrics?.unresolved ?? 0}
              subValue="assigned but not resolved"
              icon={<AlertTriangle className="w-4 h-4" />}
            />
            <StatCard
              label="Expired"
              value={performanceMetrics?.expired ?? 0}
              subValue="no activity 24h+ in period"
              positive={(performanceMetrics?.expired ?? 0) <= 0}
              icon={<AlertTriangle className="w-4 h-4" />}
            />
            <StatCard
              label="1st Response"
              value={
                performanceMetrics?.avgFirstResponseMinutes != null
                  ? `${performanceMetrics.avgFirstResponseMinutes} min`
                  : "—"
              }
              subValue="avg accept to first reply"
              icon={<Activity className="w-4 h-4" />}
            />
            <StatCard
              label="Resolution time"
              value={
                performanceMetrics?.avgResolutionTimeMinutes != null
                  ? `${performanceMetrics.avgResolutionTimeMinutes} min`
                  : "—"
              }
              subValue="avg accept to resolve"
              icon={<Target className="w-4 h-4" />}
            />
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Agent Leaderboard */}
            <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-6">
                <Award className="w-5 h-5 text-yellow-500" />
                <h3 className="font-medium text-foreground">Top Performers</h3>
              </div>
              <AgentLeaderboard data={leaderboard?.data ?? []} />
            </div>

            {/* Agent Details Table */}
            <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-medium text-foreground">All Agents</h3>
                {agentDetails?.summary && (
                  <div className="text-sm text-muted-foreground">
                    {agentDetails.summary.totalAgents} agents •{" "}
                    {agentDetails.summary.totalChatsHandled} chats
                  </div>
                )}
              </div>
              <AgentDetailsTable data={agentDetails?.data ?? []} />
            </div>
          </div>
        </div>
      </div>
    </RouteGuard>
  );
}
