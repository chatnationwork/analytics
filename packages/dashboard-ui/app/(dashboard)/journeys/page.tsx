"use client";

/**
 * =============================================================================
 * JOURNEYS ANALYTICS PAGE
 * =============================================================================
 *
 * Dashboard page for self-serve vs assisted journey analytics.
 * Shows the breakdown between bot-handled and agent-handled sessions.
 */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Users,
  Bot,
  UserCheck,
  Clock,
  TrendingUp,
  TrendingDown,
  MessageCircle,
} from "lucide-react";
import { RouteGuard } from "@/components/auth/RouteGuard";
import {
  getJourneyOverview,
  getHandoffTrend,
  getHandoffByStep,
  getHandoffReasons,
  getTimeToHandoff,
  getJourneyBreakdown,
  getAgentPerformance,
  getJourneyLabels,
  type HandoffTrendDataPoint,
  type HandoffByStepItem,
  type HandoffReasonItem,
  type JourneyBreakdownItem,
  type AgentPerformanceItem,
} from "@/lib/journeys-api";

type Granularity = "day" | "week" | "month";

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

function getJourneyLabelFromMap(
  labels: Record<string, string> | undefined,
  step: string,
): string {
  if (labels?.[step]) return labels[step];
  return step.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Ensure chart period is a string (backend may return Date). */
function toPeriodString(period: string | Date | unknown): string {
  if (typeof period === "string") return period;
  if (period instanceof Date) return period.toISOString();
  return String(period ?? "");
}

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
  const showChange = change !== undefined;
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

// Donut Chart for Journey Outcome Breakdown
function JourneyOutcomeDonutChart({
  assisted,
  completed,
  abandoned,
  total,
}: {
  assisted: number;
  completed: number;
  abandoned: number;
  total: number;
}) {
  const assistedPercent = total > 0 ? (assisted / total) * 100 : 0;
  const completedPercent = total > 0 ? (completed / total) * 100 : 0;
  const abandonedPercent = total > 0 ? (abandoned / total) * 100 : 0;

  // SVG Donut calculations
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  
  const assistedArc = (assistedPercent / 100) * circumference;
  const completedArc = (completedPercent / 100) * circumference;
  const abandonedArc = (abandonedPercent / 100) * circumference;

  // Offsets (cumulative)
  const assistedOffset = 0; // Starts at top
  const completedOffset = -assistedArc; // Starts after assisted
  const abandonedOffset = -(assistedArc + completedArc); // Starts after completed

  return (
    <div className="flex items-center gap-8">
      <div className="relative">
        <svg width="160" height="160" viewBox="0 0 160 160">
          {/* Background circle */}
          <circle
            cx="80"
            cy="80"
            r={radius}
            fill="none"
            className="stroke-muted"
            strokeWidth="20"
          />
          {/* Assisted arc (Blue) */}
          <circle
            cx="80"
            cy="80"
            r={radius}
            fill="none"
            stroke="#3b82f6"
            strokeWidth="20"
            strokeDasharray={`${assistedArc} ${circumference}`}
            strokeDashoffset={assistedOffset}
            transform="rotate(-90 80 80)"
            className="transition-all duration-500"
          />
          {/* Completed arc (Green) */}
          <circle
            cx="80"
            cy="80"
            r={radius}
            fill="none"
            stroke="#10b981"
            strokeWidth="20"
            strokeDasharray={`${completedArc} ${circumference}`}
            strokeDashoffset={completedOffset}
            transform="rotate(-90 80 80)"
            className="transition-all duration-500"
          />
          {/* Abandoned arc (Amber/Red) */}
          <circle
            cx="80"
            cy="80"
            r={radius}
            fill="none"
            stroke="#f59e0b"
            strokeWidth="20"
            strokeDasharray={`${abandonedArc} ${circumference}`}
            strokeDashoffset={abandonedOffset}
            transform="rotate(-90 80 80)"
            className="transition-all duration-500"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-foreground">
            {total.toLocaleString()}
          </span>
          <span className="text-xs text-muted-foreground">Total</span>
        </div>
      </div>
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="h-4 w-4 rounded-full bg-blue-500" />
          <div>
            <div className="text-sm font-medium text-foreground">
              Assisted ({assistedPercent.toFixed(1)}%)
            </div>
            <div className="text-xs text-muted-foreground">
              {assisted.toLocaleString()} sessions
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="h-4 w-4 rounded-full bg-emerald-500" />
          <div>
            <div className="text-sm font-medium text-foreground">
              Completed ({completedPercent.toFixed(1)}%)
            </div>
            <div className="text-xs text-muted-foreground">
              {completed.toLocaleString()} sessions
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="h-4 w-4 rounded-full bg-amber-500" />
          <div>
            <div className="text-sm font-medium text-foreground">
              Abandoned ({abandonedPercent.toFixed(1)}%)
            </div>
            <div className="text-xs text-muted-foreground">
              {abandoned.toLocaleString()} sessions
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Handoff Trend Chart
function HandoffTrendChart({ data }: { data: HandoffTrendDataPoint[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-muted-foreground">
        No data available
      </div>
    );
  }

  const maxValue = Math.max(...data.map((d) => d.totalSessions));
  const formatPeriod = (period: string | Date) => {
    const date = typeof period === "string" ? new Date(period) : period;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  return (
    <div className="space-y-4">
      <div className="flex h-48 items-end gap-1">
        {data.map((d, i) => {
          const selfServeHeight =
            maxValue > 0 ? (d.selfServe / maxValue) * 100 : 0;
          const assistedHeight =
            maxValue > 0 ? (d.assisted / maxValue) * 100 : 0;

          return (
            <div
              key={toPeriodString(d.period) || i}
              className="group relative flex flex-1 flex-col items-center"
              title={`${formatPeriod(d.period)}: ${d.selfServe} self-serve, ${d.assisted} assisted`}
            >
              <div className="absolute bottom-full mb-2 bg-popover text-popover-foreground text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10 border border-border shadow-md">
                {formatPeriod(d.period)}: {d.selfServe} self-serve, {d.assisted}{" "}
                assisted
              </div>
              <div className="relative flex w-full flex-col items-stretch">
                {/* Assisted bar (top) */}
                <div
                  className="w-full rounded-t bg-blue-500 transition-all group-hover:bg-blue-400"
                  style={{ height: `${assistedHeight * 1.8}px` }}
                />
                {/* Self-serve bar (bottom) */}
                <div
                  className="w-full bg-emerald-500 transition-all group-hover:bg-emerald-400"
                  style={{ height: `${selfServeHeight * 1.8}px` }}
                />
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{formatPeriod(data[0]?.period ?? "")}</span>
        <span>{formatPeriod(data[data.length - 1]?.period ?? "")}</span>
      </div>
      <div className="flex justify-center gap-6 text-xs">
        <div className="flex items-center gap-1">
          <div className="h-3 w-3 rounded bg-emerald-500" />
          <span className="text-muted-foreground">Self-Serve</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="h-3 w-3 rounded bg-blue-500" />
          <span className="text-muted-foreground">Assisted</span>
        </div>
      </div>
    </div>
  );
}

// Handoff Rate Trend Chart (line-style)
function HandoffRateTrendChart({ data }: { data: HandoffTrendDataPoint[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-muted-foreground">
        No data available
      </div>
    );
  }

  const maxRate = Math.max(...data.map((d) => d.handoffRate), 10);

  return (
    <div className="space-y-2">
      <div className="flex h-40 items-end gap-1">
        {data.map((d, i) => {
          const height = maxRate > 0 ? (d.handoffRate / maxRate) * 100 : 0;
          return (
            <div
              key={toPeriodString(d.period) || i}
              className="group relative flex flex-1 flex-col items-center justify-end"
              title={`Handoff Rate: ${d.handoffRate.toFixed(1)}%`}
            >
              <div className="absolute bottom-full mb-2 bg-popover text-popover-foreground text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10 border border-border shadow-md">
                {d.handoffRate.toFixed(1)}%
              </div>
              <div
                className="w-full rounded-t bg-amber-500 transition-all group-hover:bg-amber-400"
                style={{ height: `${height * 1.5}px`, minHeight: "4px" }}
              />
            </div>
          );
        })}
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>0%</span>
        <span>{maxRate.toFixed(0)}%</span>
      </div>
    </div>
  );
}

// Handoff by Step Bar Chart
function HandoffByStepChart({ data }: { data: HandoffByStepItem[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-muted-foreground">
        No handoff data available
      </div>
    );
  }

  const maxHandoffs = Math.max(...data.map((d) => d.handoffs));

  return (
    <div className="space-y-3">
      {data.slice(0, 8).map((item, i) => {
        const width = maxHandoffs > 0 ? (item.handoffs / maxHandoffs) * 100 : 0;
        return (
          <div key={i} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="truncate font-medium text-foreground">
                {item.step}
              </span>
              <span className="text-muted-foreground">
                {item.handoffs} ({item.percentage.toFixed(1)}%)
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-purple-500 transition-all"
                style={{ width: `${width}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Handoff Reasons Chart
function HandoffReasonsChart({ data }: { data: HandoffReasonItem[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-muted-foreground">
        No reason data available
      </div>
    );
  }

  const colors = [
    "bg-blue-500",
    "bg-emerald-500",
    "bg-amber-500",
    "bg-purple-500",
    "bg-pink-500",
    "bg-cyan-500",
  ];

  return (
    <div className="space-y-3">
      {data.slice(0, 6).map((item, i) => (
        <div key={i} className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className={`h-3 w-3 rounded-full ${colors[i % colors.length]}`}
            />
            <span className="text-sm font-medium text-foreground capitalize">
              {item.reason.replace(/_/g, " ")}
            </span>
          </div>
          <span className="text-sm text-muted-foreground">
            {item.count} ({item.percentage.toFixed(1)}%)
          </span>
        </div>
      ))}
    </div>
  );
}

// Individual journeys: Completed (self-serve) vs Assisted per journey
function JourneyBreakdownTable({
  data,
  getLabel,
}: {
  data: JourneyBreakdownItem[];
  getLabel: (step: string) => string;
}) {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-muted-foreground text-sm">
        No journey data yet. Data appears when users complete journeys or hand
        off to agents.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-3 font-medium text-foreground">
              Journey
            </th>
            <th className="text-right py-3 font-medium text-foreground">
              Started
            </th>
            <th className="text-right py-3 font-medium text-foreground">
              Completed (self-serve)
            </th>
            <th className="text-right py-3 font-medium text-foreground">
              Dropped off
            </th>
            <th className="text-right py-3 font-medium text-foreground">
              Assisted
            </th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i} className="border-b border-border/50">
              <td className="py-2.5 font-medium text-foreground">
                {getLabel(row.step)}
              </td>
              <td className="py-2.5 text-right text-muted-foreground">
                {row.started > 0 ? row.started.toLocaleString() : "—"}
              </td>
              <td className="py-2.5 text-right text-muted-foreground">
                {row.completedSelfServe.toLocaleString()}
              </td>
              <td className="py-2.5 text-right text-muted-foreground">
                {row.droppedOff > 0 ? row.droppedOff.toLocaleString() : "—"}
              </td>
              <td className="py-2.5 text-right text-muted-foreground">
                {row.assisted.toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// =============================================================================
// MAIN PAGE COMPONENT
// =============================================================================

const PRESETS = [
  { label: "Today", days: 0 },
  { label: "Last 7 days", days: 7 },
  { label: "Last 30 days", days: 30 },
  { label: "Last 90 days", days: 90 },
] as const;

export default function JourneysPage() {
  const [granularity, setGranularity] = useState<Granularity>("day");
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

  const periods = granularity === "day" ? 30 : granularity === "week" ? 12 : 6;
  const dateRangeLabel = formatDateRangeLabel(dateStart, dateEnd);

  const overviewQuery = useQuery({
    queryKey: ["journeys-overview", granularity, periods, dateStart, dateEnd],
    queryFn: () => getJourneyOverview(granularity, periods, dateStart, dateEnd),
  });

  const handoffTrendQuery = useQuery({
    queryKey: [
      "journeys-handoff-trend",
      granularity,
      periods,
      dateStart,
      dateEnd,
    ],
    queryFn: () => getHandoffTrend(granularity, periods, dateStart, dateEnd),
  });

  const handoffByStepQuery = useQuery({
    queryKey: [
      "journeys-handoff-by-step",
      granularity,
      periods,
      dateStart,
      dateEnd,
    ],
    queryFn: () => getHandoffByStep(granularity, periods, dateStart, dateEnd),
  });

  const handoffReasonsQuery = useQuery({
    queryKey: [
      "journeys-handoff-reasons",
      granularity,
      periods,
      dateStart,
      dateEnd,
    ],
    queryFn: () => getHandoffReasons(granularity, periods, dateStart, dateEnd),
  });

  const timeToHandoffQuery = useQuery({
    queryKey: [
      "journeys-time-to-handoff",
      granularity,
      periods,
      dateStart,
      dateEnd,
    ],
    queryFn: () => getTimeToHandoff(granularity, periods, dateStart, dateEnd),
  });

  const journeyBreakdownQuery = useQuery({
    queryKey: ["journeys-by-journey", granularity, periods, dateStart, dateEnd],
    queryFn: () =>
      getJourneyBreakdown(granularity, periods, dateStart, dateEnd),
  });

  const agentPerformanceQuery = useQuery({
    queryKey: [
      "journeys-agent-performance",
      granularity,
      periods,
      dateStart,
      dateEnd,
    ],
    queryFn: () =>
      getAgentPerformance(granularity, periods, dateStart, dateEnd),
  });

  const labelsQuery = useQuery({
    queryKey: ["journeys-labels"],
    queryFn: getJourneyLabels,
  });

  const overview = overviewQuery.data;
  const handoffTrend = handoffTrendQuery.data;
  const handoffByStep = handoffByStepQuery.data;
  const handoffReasons = handoffReasonsQuery.data;
  const timeToHandoff = timeToHandoffQuery.data;
  const journeyBreakdown = journeyBreakdownQuery.data;
  const agentPerformance = agentPerformanceQuery.data;
  const journeyLabels = labelsQuery.data;

  const getLabel = (step: string) =>
    getJourneyLabelFromMap(journeyLabels, step);

  const isLoading =
    overviewQuery.isLoading ||
    handoffTrendQuery.isLoading ||
    handoffByStepQuery.isLoading;

  return (
    <RouteGuard permission="analytics.view">
      <div className="space-y-6">
        {/* Header + date filter */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-semibold text-foreground">
                Self-Serve Analytics
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                {dateRangeLabel}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
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
          </div>
          {/* Date filter */}
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

        {!isLoading && (
          <>
            {/* Overview Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <StatCard
                label="Total Journeys"
                value={overview?.totalSessions.toLocaleString() || "0"}
                icon={<Users className="w-4 h-4" />}
              />
              <StatCard
                label="Assisted Rate"
                value={`${overview?.assistedRate.toFixed(1) || "0"}%`}
                subValue={`${overview?.assistedSessions.toLocaleString() || "0"} sessions`}
                change={overview?.assistedChange}
                positive={
                  overview?.assistedChange
                    ? overview.assistedChange <= 0
                    : undefined
                }
                icon={<UserCheck className="w-4 h-4" />}
              />
              <StatCard
                label="Completion Rate"
                value={`${overview?.completionRate.toFixed(1) || "0"}%`}
                subValue={`${overview?.completedSessions.toLocaleString() || "0"} sessions`}
                change={overview?.completionChange}
                positive={
                  overview?.completionChange
                    ? overview.completionChange >= 0
                    : undefined
                }
                icon={<Bot className="w-4 h-4" />}
              />
              <StatCard
                label="Abandonment Rate"
                value={`${overview?.abandonmentRate.toFixed(1) || "0"}%`}
                subValue={`${overview?.abandonedSessions.toLocaleString() || "0"} sessions`}
                change={overview?.abandonmentChange}
                positive={
                  overview?.abandonmentChange
                    ? overview.abandonmentChange <= 0
                    : undefined
                }
                icon={<TrendingDown className="w-4 h-4" />}
              />
              <StatCard
                label="Bot Chat Only"
                value={overview?.botChatOnly?.toLocaleString() || "0"}
                subValue="No journey started"
                change={overview?.botChatOnlyChange}
                positive={
                  overview?.botChatOnlyChange
                    ? overview.botChatOnlyChange <= 0
                    : undefined
                }
                icon={<MessageCircle className="w-4 h-4" />}
              />
            </div>

            {/* Journey Breakdown & Trend */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Donut Chart */}
              <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
                <h2 className="text-base font-semibold text-foreground">
                  Journey Outcome Breakdown
                </h2>
                <p className="text-sm text-muted-foreground mt-0.5 mb-4">
                  Assisted vs Completed vs Abandoned
                </p>
                <div className="flex justify-center">
                  <JourneyOutcomeDonutChart
                    assisted={overview?.assistedSessions || 0}
                    completed={overview?.completedSessions || 0}
                    abandoned={overview?.abandonedSessions || 0}
                    total={overview?.totalSessions || 0}
                  />
                </div>
              </div>

              {/* Trend Chart */}
              <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-base font-semibold text-foreground">
                      Session Trend
                    </h2>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      Self-serve vs assisted over time
                    </p>
                  </div>
                  {handoffTrend?.summary && (
                    <div className="text-right">
                      <div className="text-xl font-bold text-foreground">
                        {handoffTrend.summary.avgHandoffRate.toFixed(1)}%
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Avg Handoff Rate
                      </div>
                    </div>
                  )}
                </div>
                <HandoffTrendChart data={handoffTrend?.data || []} />
              </div>
            </div>

            {/* Handoff Rate Trend */}
            <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-semibold text-foreground">
                    Handoff Rate Trend
                  </h2>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Percentage of sessions escalated to agents
                  </p>
                </div>
                {handoffTrend?.summary && (
                  <span
                    className={`text-sm font-medium flex items-center gap-1 ${
                      handoffTrend.summary.percentChange <= 0
                        ? "text-green-500"
                        : "text-red-500"
                    }`}
                  >
                    {handoffTrend.summary.percentChange <= 0 ? (
                      <TrendingDown className="w-3 h-3" />
                    ) : (
                      <TrendingUp className="w-3 h-3" />
                    )}
                    {handoffTrend.summary.percentChange >= 0 ? "+" : ""}
                    {handoffTrend.summary.percentChange.toFixed(1)}% change
                  </span>
                )}
              </div>
              <HandoffRateTrendChart data={handoffTrend?.data || []} />
            </div>

            {/* Individual journeys: Completed vs Assisted */}
            <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
              <h2 className="text-base font-semibold text-foreground">
                By journey
              </h2>
              <p className="text-sm text-muted-foreground mt-0.5 mb-4">
                Per-journey breakdown: started (journeyStart), completed
                (self-serve, journeyEnd without handoff), dropped off (started −
                completed), and assisted (handed off to agent). When events send
                journey_start/journey_end flags, Started and Dropped off are
                populated.
              </p>
              <JourneyBreakdownTable
                data={journeyBreakdown?.data ?? []}
                getLabel={getLabel}
              />
            </div>

            {/* Handoff Details */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Handoff by Step */}
              <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
                <h2 className="text-base font-semibold text-foreground">
                  Handoffs by Journey Step
                </h2>
                <p className="text-sm text-muted-foreground mt-0.5 mb-4">
                  Which steps lead to agent handoffs
                </p>
                <HandoffByStepChart data={handoffByStep?.data || []} />
              </div>

              {/* Handoff Reasons */}
              <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
                <h2 className="text-base font-semibold text-foreground">
                  Handoff Reasons
                </h2>
                <p className="text-sm text-muted-foreground mt-0.5 mb-4">
                  Why users are transferred to agents
                </p>
                <HandoffReasonsChart data={handoffReasons?.data || []} />
              </div>
            </div>

          
          </>
        )}
      </div>
    </RouteGuard>
  );
}
