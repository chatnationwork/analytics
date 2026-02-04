"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  whatsappAnalyticsApi,
  Granularity,
} from "@/lib/whatsapp-analytics-api";
import {
  TrendingUp,
  TrendingDown,
  MessageCircle,
  Target,
  Users,
} from "lucide-react";

export default function WhatsAppAnalyticsPage() {
  const [granularity, setGranularity] = useState<Granularity>("day");
  const periods = granularity === "day" ? 30 : granularity === "week" ? 12 : 12;

  const { data: stats } = useQuery({
    queryKey: ["whatsapp-stats"],
    queryFn: () => whatsappAnalyticsApi.getStats(),
  });

  const { data: volume } = useQuery({
    queryKey: ["whatsapp-volume"],
    queryFn: () => whatsappAnalyticsApi.getVolume(),
  });

  const { data: heatmap } = useQuery({
    queryKey: ["whatsapp-heatmap"],
    queryFn: () => whatsappAnalyticsApi.getHeatmap(),
  });

  const { data: agents } = useQuery({
    queryKey: ["whatsapp-agents"],
    queryFn: () => whatsappAnalyticsApi.getAgents(),
  });

  const { data: responseTime } = useQuery({
    queryKey: ["whatsapp-response-time"],
    queryFn: () => whatsappAnalyticsApi.getResponseTime(),
  });

  const { data: funnel } = useQuery({
    queryKey: ["whatsapp-funnel"],
    queryFn: () => whatsappAnalyticsApi.getFunnel(),
  });

  // Trend queries
  const { data: volumeTrend } = useQuery({
    queryKey: ["whatsapp-volume-trend", granularity, periods],
    queryFn: () =>
      whatsappAnalyticsApi.getMessageVolumeTrend(granularity, periods),
  });

  const { data: responseTimeTrend } = useQuery({
    queryKey: ["whatsapp-response-time-trend", granularity, periods],
    queryFn: () =>
      whatsappAnalyticsApi.getResponseTimeTrend(granularity, periods),
  });

  const { data: readRateTrend } = useQuery({
    queryKey: ["whatsapp-read-rate-trend", granularity, periods],
    queryFn: () => whatsappAnalyticsApi.getReadRateTrend(granularity, periods),
  });

  const { data: newContactsTrend } = useQuery({
    queryKey: ["whatsapp-new-contacts-trend", granularity, periods],
    queryFn: () =>
      whatsappAnalyticsApi.getNewContactsTrend(granularity, periods),
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-foreground">
          WhatsApp Analytics
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Insights from WhatsApp events we collect
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          label="Messages Received"
          value={stats?.messagesReceived?.toLocaleString() ?? "0"}
          change="Last 30 days"
          positive
          icon={<MessageCircle className="w-4 h-4" />}
        />
        <StatCard
          label="Messages Sent"
          value={stats?.messagesSent?.toLocaleString() ?? "0"}
          change="Last 30 days"
          positive
          icon={<MessageCircle className="w-4 h-4" />}
        />
        <StatCard
          label="Read Rate"
          value={`${Math.round(stats?.readRate ?? 0)}%`}
          change="vs Sent"
          positive
          icon={<Target className="w-4 h-4" />}
        />
        <StatCard
          label="Unique Contacts"
          value={stats?.uniqueContacts?.toLocaleString() ?? "0"}
          change="Active in period"
          positive
          icon={<Users className="w-4 h-4" />}
        />
        <StatCard
          label="New Contacts"
          value={stats?.newContacts?.toLocaleString() ?? "0"}
          change="First-time users"
          positive
          icon={<Users className="w-4 h-4" />}
        />
      </div>

      {/* Trends Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">
            Message Trends
          </h2>
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
          {/* Message Volume Trend */}
          {/*
            TS note: normalizeTrend() returns T[] but defaults to unknown[] if not parameterized.
            We pass explicit generics so chart props type-check.
          */}
          <MessageVolumeTrendChart
            data={
              normalizeTrend<
                { period: string; received: number; sent: number },
                { totalReceived: number; totalSent: number; total: number }
              >(volumeTrend).data
            }
            summary={
              normalizeTrend<
                { period: string; received: number; sent: number },
                { totalReceived: number; totalSent: number; total: number }
              >(volumeTrend).summary
            }
          />

          {/* Response Time Trend */}
          <ResponseTimeTrendChart
            data={
              normalizeTrend<
                {
                  period: string;
                  medianMinutes: number;
                  p95Minutes: number;
                  responseCount: number;
                },
                {
                  overallMedianMinutes: number;
                  totalResponses: number;
                  targetMinutes: number;
                }
              >(responseTimeTrend).data
            }
            summary={
              normalizeTrend<
                {
                  period: string;
                  medianMinutes: number;
                  p95Minutes: number;
                  responseCount: number;
                },
                {
                  overallMedianMinutes: number;
                  totalResponses: number;
                  targetMinutes: number;
                }
              >(responseTimeTrend).summary
            }
          />
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Read Rate Trend */}
          <ReadRateTrendChart
            data={
              normalizeTrend<
                {
                  period: string;
                  sent: number;
                  readCount: number;
                  readRate: number;
                },
                {
                  totalSent: number;
                  totalRead: number;
                  overallReadRate: number;
                }
              >(readRateTrend).data
            }
            summary={
              normalizeTrend<
                {
                  period: string;
                  sent: number;
                  readCount: number;
                  readRate: number;
                },
                {
                  totalSent: number;
                  totalRead: number;
                  overallReadRate: number;
                }
              >(readRateTrend).summary
            }
          />

          {/* New Contacts Trend */}
          <NewContactsTrendChart
            data={
              normalizeTrend<
                { period: string; newContacts: number },
                {
                  totalNewContacts: number;
                  previousTotal: number;
                  percentChange: number;
                }
              >(newContactsTrend).data
            }
            summary={
              normalizeTrend<
                { period: string; newContacts: number },
                {
                  totalNewContacts: number;
                  previousTotal: number;
                  percentChange: number;
                }
              >(newContactsTrend).summary
            }
          />
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Response Time Distribution */}
        <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
          <h3 className="font-medium text-foreground mb-6">
            Response Time Distribution
          </h3>
          <ResponseTimeHistogram data={responseTime?.distribution ?? []} />
          <div className="text-sm text-muted-foreground mt-4 text-center">
            Median:{" "}
            <span className="text-foreground">
              {responseTime?.medianMinutes
                ? `${responseTime.medianMinutes.toFixed(1)}m`
                : "--"}
            </span>{" "}
            • Target: <span className="text-green-500">&lt; 5m</span>
          </div>
        </div>

        {/* Volume by Hour */}
        <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
          <h3 className="font-medium text-foreground mb-6">
            Message Volume by Hour
          </h3>
          <VolumeChart data={volume ?? []} />
          <div className="text-sm text-muted-foreground mt-4 text-center">
            (UTC time)
          </div>
        </div>
      </div>

      {/* Heatmap */}
      <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
        <h3 className="font-medium text-foreground mb-6">
          Activity by Day & Hour
        </h3>
        <HeatmapChart data={heatmap ?? []} />
        <p className="text-sm text-muted-foreground mt-4 text-center">
          Heatmap based on message volume
        </p>
      </div>

      {/* Message Funnel */}
      <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
        <h3 className="font-medium text-foreground mb-6">Message Funnel</h3>
        <MessageFunnel data={funnel?.funnel ?? []} rates={funnel?.rates} />
      </div>

      {/* Note about data source */}
      <div className="bg-blue-500/10 rounded-xl border border-blue-500/20 p-4">
        <div className="flex items-start gap-3">
          <div className="text-blue-400 mt-0.5">ℹ️</div>
          <div>
            <div className="font-medium text-blue-400">About This Data</div>
          </div>
        </div>
      </div>
    </div>
  );
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
  change: string;
  positive: boolean;
  icon: React.ReactNode;
}) {
  return (
    <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <span className="text-muted-foreground text-sm">{label}</span>
        <div className="text-muted-foreground">{icon}</div>
      </div>
      <div className="text-2xl font-bold text-foreground mb-1">{value}</div>
      <div
        className={`text-sm flex items-center gap-1 ${positive ? "text-green-500" : "text-muted-foreground"}`}
      >
        {positive ? <TrendingUp className="w-3 h-3" /> : null}
        {change}
      </div>
    </div>
  );
}

function ResponseTimeHistogram({
  data,
}: {
  data: { bucket: string; count: string }[];
}) {
  const buckets = [
    "0-1",
    "1-2",
    "2-3",
    "3-4",
    "4-5",
    "5-6",
    "6-7",
    "7-8",
    "8-9",
    "9+",
  ];
  const counts = buckets.map((b) => {
    const found = data.find((d) => d.bucket === b);
    return found ? parseInt(found.count, 10) : 0;
  });
  const max = Math.max(...counts, 1);

  if (counts.every((c) => c === 0)) {
    return (
      <div className="h-32 flex items-center justify-center text-muted-foreground text-sm">
        No response time data available
      </div>
    );
  }

  return (
    <div className="h-32 flex items-end gap-1">
      {counts.map((val, i) => (
        <div
          key={i}
          className="flex-1 flex flex-col items-center gap-1 group relative"
        >
          <div
            className={`w-full rounded-t min-h-[2px] ${i < 5 ? "bg-gradient-to-t from-green-600 to-green-400" : "bg-gradient-to-t from-amber-600 to-amber-400"}`}
            style={{ height: `${(val / max) * 100}%` }}
          />
          <span className="text-[9px] text-muted-foreground">
            {buckets[i]}m
          </span>
          {val > 0 && (
            <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-popover text-popover-foreground text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity z-10 shadow-md">
              {val}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function MessageFunnel({
  data,
  rates,
}: {
  data: { stage: string; count: number }[];
  rates?: { deliveryRate: number; readRate: number; replyRate: number };
}) {
  if (!data.length) {
    return (
      <div className="text-muted-foreground text-sm text-center py-8">
        No funnel data available
      </div>
    );
  }

  const max = Math.max(...data.map((d) => d.count), 1);
  const colors = ["#3B82F6", "#8B5CF6", "#10B981", "#F59E0B"];

  return (
    <div className="space-y-3">
      {data.map((item, i) => (
        <div key={item.stage} className="flex items-center gap-3">
          <div className="w-20 text-sm text-muted-foreground">{item.stage}</div>
          <div className="flex-1 h-8 bg-muted rounded relative overflow-hidden">
            <div
              className="h-full rounded transition-all"
              style={{
                width: `${(item.count / max) * 100}%`,
                backgroundColor: colors[i % colors.length],
              }}
            />
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-foreground font-medium">
              {item.count.toLocaleString()}
            </span>
          </div>
        </div>
      ))}
      {rates && (
        <div className="flex justify-between text-xs text-muted-foreground mt-4 pt-3 border-t border-border">
          <span>
            Delivery:{" "}
            <span className="text-foreground">
              {rates.deliveryRate.toFixed(1)}%
            </span>
          </span>
          <span>
            Read:{" "}
            <span className="text-foreground">
              {rates.readRate.toFixed(1)}%
            </span>
          </span>
          <span>
            Reply:{" "}
            <span className="text-foreground">
              {rates.replyRate.toFixed(1)}%
            </span>
          </span>
        </div>
      )}
    </div>
  );
}

function VolumeChart({ data }: { data: any[] }) {
  const hours = Array.from({ length: 24 }, (_, i) => i);
  // data is [{ hour: '14', count: '5' }]
  const counts = hours.map((h) => {
    const found = data.find((d) => Number(d.hour) === h);
    return found ? Number(found.count) : 0;
  });

  const max = Math.max(...counts, 1);

  return (
    <div className="h-32 flex items-end gap-1">
      {counts.map((val, i) => (
        <div
          key={i}
          className="flex-1 flex flex-col items-center gap-1 group relative"
        >
          <div
            className="w-full bg-gradient-to-t from-green-600 to-green-400 rounded-t min-h-[1px]"
            style={{ height: `${(val / max) * 100}%` }}
          />
          {i % 3 === 0 && (
            <span className="text-[10px] text-muted-foreground">{i}h</span>
          )}
          {val > 0 && (
            <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-popover text-popover-foreground text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity shadow-md">
              {val}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function HeatmapChart({ data }: { data: any[] }) {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const hours = ["6am", "9am", "12pm", "3pm", "6pm", "9pm"];

  // Create 7x24 grid
  const grid = Array(7)
    .fill(0)
    .map(() => Array(24).fill(0));
  let max = 1;

  data.forEach((d) => {
    const day = Number(d.day);
    const hour = Number(d.hour);
    const count = Number(d.count);
    if (grid[day] && grid[day][hour] !== undefined) {
      grid[day][hour] = count;
      if (count > max) max = count;
    }
  });

  return (
    <div className="flex gap-2">
      <div className="flex flex-col gap-1 pr-2 text-xs text-muted-foreground">
        {days.map((d) => (
          <div key={d} className="h-6 flex items-center">
            {d}
          </div>
        ))}
      </div>
      <div className="flex-1 overflow-x-auto">
        <div className="flex gap-1 mb-2 text-xs text-muted-foreground min-w-[600px]">
          {Array.from({ length: 24 }, (_, i) => i).map((h) => (
            <div key={h} className="flex-1 text-center">
              {h}
            </div>
          ))}
        </div>
        <div className="space-y-1 min-w-[600px]">
          {grid.map((row, i) => (
            <div key={i} className="flex gap-1">
              {row.map((val, j) => (
                <div
                  key={j}
                  className="flex-1 h-6 rounded"
                  style={{
                    backgroundColor:
                      val > 0
                        ? `rgba(34, 197, 94, ${Math.max(val / max, 0.2)})`
                        : "rgba(255, 255, 255, 0.05)",
                  }}
                  title={`${days[i]} ${j}:00 - ${val} messages`}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// TREND CHART COMPONENTS
// =============================================================================

/** Normalize trend API response: handle both { data, summary } and double-wrapped { data: { data, summary } } */
function normalizeTrend<T, S>(res: unknown): { data: T[]; summary?: S } {
  if (!res || typeof res !== "object") return { data: [] };
  const o = res as Record<string, unknown>;
  if (Array.isArray(o.data))
    return { data: o.data as T[], summary: o.summary as S };
  if (o.data && typeof o.data === "object" && !Array.isArray(o.data)) {
    const inner = o.data as Record<string, unknown>;
    if (Array.isArray(inner.data))
      return { data: inner.data as T[], summary: inner.summary as S };
  }
  return { data: [] };
}

function formatDate(d: string | Date) {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function MessageVolumeTrendChart({
  data,
  summary,
}: {
  data: { period: string; received: number; sent: number }[];
  summary?: { totalReceived: number; totalSent: number; total: number };
}) {
  if (!data?.length) {
    return (
      <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
        <h3 className="font-medium text-foreground mb-6">
          Message Volume Trend
        </h3>
        <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
          No data available
        </div>
      </div>
    );
  }

  const receivedSent = data.map((d) => ({
    received: Number(d.received) || 0,
    sent: Number(d.sent) || 0,
    period: d.period,
  }));
  const max =
    Math.max(...receivedSent.map((d) => Math.max(d.received, d.sent)), 0) || 1;

  return (
    <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-medium text-foreground">Message Volume Trend</h3>
          {summary && (
            <p className="text-sm text-muted-foreground mt-1">
              {summary.total.toLocaleString()} total messages
            </p>
          )}
        </div>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-blue-500" />
            <span className="text-muted-foreground">Received</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span className="text-muted-foreground">Sent</span>
          </div>
        </div>
      </div>

      <div className="h-48 flex items-end gap-1">
        {receivedSent.map((point, i) => (
          <div
            key={i}
            className="flex-1 flex flex-col items-center gap-0.5 group relative"
          >
            <div className="absolute bottom-full mb-2 bg-popover text-popover-foreground text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10 border border-border shadow-md">
              {formatDate(point.period)}: {point.received} received,{" "}
              {point.sent} sent
            </div>
            <div
              className="w-full flex gap-0.5 items-end"
              style={{ height: "100%" }}
            >
              <div
                className="flex-1 bg-gradient-to-t from-blue-600 to-blue-400 rounded-t min-h-[2px]"
                style={{ height: `${(point.received / max) * 100}%` }}
              />
              <div
                className="flex-1 bg-gradient-to-t from-green-600 to-green-400 rounded-t min-h-[2px]"
                style={{ height: `${(point.sent / max) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-between mt-2 text-xs text-muted-foreground">
        <span>{formatDate(receivedSent[0]?.period)}</span>
        {receivedSent.length > 2 && (
          <span>
            {formatDate(
              receivedSent[Math.floor(receivedSent.length / 2)]?.period,
            )}
          </span>
        )}
        <span>{formatDate(receivedSent[receivedSent.length - 1]?.period)}</span>
      </div>
    </div>
  );
}

function ResponseTimeTrendChart({
  data,
  summary,
}: {
  data: {
    period: string;
    medianMinutes: number;
    p95Minutes: number;
    responseCount: number;
  }[];
  summary?: {
    overallMedianMinutes: number;
    totalResponses: number;
    targetMinutes: number;
  };
}) {
  if (!data?.length) {
    return (
      <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
        <h3 className="font-medium text-foreground mb-6">
          Response Time Trend
        </h3>
        <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
          No data available
        </div>
      </div>
    );
  }

  const points = data.map((d) => ({
    ...d,
    medianMinutes: Number(d.medianMinutes) || 0,
    period: d.period,
  }));
  const maxMedian =
    Math.max(
      ...points.map((d) => d.medianMinutes),
      summary?.targetMinutes || 5,
    ) * 1.2 || 10;

  return (
    <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-medium text-foreground">Response Time Trend</h3>
          {summary && (
            <div className="flex items-center gap-2 mt-1">
              <span className="text-2xl font-bold text-foreground">
                {summary.overallMedianMinutes}m
              </span>
              <span className="text-sm text-muted-foreground">median</span>
            </div>
          )}
        </div>
        {summary?.targetMinutes && (
          <div className="text-right">
            <div className="text-sm text-muted-foreground">Target</div>
            <div className="text-lg font-semibold text-green-500">
              &lt; {summary.targetMinutes}m
            </div>
          </div>
        )}
      </div>

      <div className="relative h-48 flex items-end gap-1">
        {/* Target line */}
        {summary?.targetMinutes && (
          <div
            className="absolute left-0 right-0 border-t-2 border-dashed border-green-500/50"
            style={{ bottom: `${(summary.targetMinutes / maxMedian) * 100}%` }}
          />
        )}

        {points.map((point, i) => {
          const heightPercent = (point.medianMinutes / maxMedian) * 100;
          const isUnderTarget = summary?.targetMinutes
            ? point.medianMinutes <= summary.targetMinutes
            : true;

          return (
            <div
              key={i}
              className="flex-1 flex flex-col items-center gap-1 group relative"
            >
              <div className="absolute bottom-full mb-2 bg-popover text-popover-foreground text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10 border border-border shadow-md">
                {formatDate(point.period)}: {point.medianMinutes.toFixed(1)}m
                median
              </div>
              <div
                className={`w-full rounded-t min-h-[2px] ${
                  isUnderTarget
                    ? "bg-gradient-to-t from-green-600 to-green-400"
                    : "bg-gradient-to-t from-amber-600 to-amber-400"
                }`}
                style={{ height: `${heightPercent}%` }}
              />
            </div>
          );
        })}
      </div>

      <div className="flex justify-between mt-2 text-xs text-muted-foreground">
        <span>{formatDate(points[0]?.period)}</span>
        {points.length > 2 && (
          <span>
            {formatDate(points[Math.floor(points.length / 2)]?.period)}
          </span>
        )}
        <span>{formatDate(points[points.length - 1]?.period)}</span>
      </div>
    </div>
  );
}

function ReadRateTrendChart({
  data,
  summary,
}: {
  data: { period: string; sent: number; readCount: number; readRate: number }[];
  summary?: { totalSent: number; totalRead: number; overallReadRate: number };
}) {
  if (!data?.length) {
    return (
      <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
        <h3 className="font-medium text-foreground mb-6">Read Rate Trend</h3>
        <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
          No data available
        </div>
      </div>
    );
  }

  const maxRate = 100; // Percentage scale
  const points = data.map((d) => ({
    ...d,
    readRate: Number(d.readRate) || 0,
    sent: Number(d.sent) || 0,
    readCount: Number(d.readCount) || 0,
  }));

  return (
    <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-medium text-foreground">Read Rate Trend</h3>
          {summary && (
            <div className="flex items-center gap-2 mt-1">
              <span className="text-2xl font-bold text-foreground">
                {summary.overallReadRate}%
              </span>
              <span className="text-sm text-muted-foreground">overall</span>
            </div>
          )}
        </div>
      </div>

      <div className="h-48 flex items-end gap-1">
        {points.map((point, i) => {
          const heightPercent = (point.readRate / maxRate) * 100;

          return (
            <div
              key={i}
              className="flex-1 flex flex-col items-center gap-1 group relative"
            >
              <div className="absolute bottom-full mb-2 bg-popover text-popover-foreground text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10 border border-border shadow-md">
                {formatDate(point.period)}: {point.readRate.toFixed(1)}% (
                {point.readCount}/{point.sent})
              </div>
              <div
                className="w-full bg-gradient-to-t from-purple-600 to-purple-400 rounded-t min-h-[2px]"
                style={{ height: `${heightPercent}%` }}
              />
            </div>
          );
        })}
      </div>

      <div className="flex justify-between mt-2 text-xs text-muted-foreground">
        <span>{formatDate(points[0]?.period)}</span>
        {points.length > 2 && (
          <span>
            {formatDate(points[Math.floor(points.length / 2)]?.period)}
          </span>
        )}
        <span>{formatDate(points[points.length - 1]?.period)}</span>
      </div>
    </div>
  );
}

function NewContactsTrendChart({
  data,
  summary,
}: {
  data: { period: string; newContacts: number }[];
  summary?: {
    totalNewContacts: number;
    previousTotal: number;
    percentChange: number;
  };
}) {
  if (!data?.length) {
    return (
      <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
        <h3 className="font-medium text-foreground mb-6">New Contacts Trend</h3>
        <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
          No data available
        </div>
      </div>
    );
  }

  const points = data.map((d) => ({
    ...d,
    newContacts: Number(d.newContacts) || 0,
  }));
  const max = Math.max(...points.map((d) => d.newContacts), 0) || 1;

  return (
    <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-medium text-foreground">New Contacts Trend</h3>
          {summary && (
            <div className="flex items-center gap-2 mt-1">
              <span className="text-2xl font-bold text-foreground">
                {summary.totalNewContacts.toLocaleString()}
              </span>
              {summary.percentChange !== 0 && (
                <span
                  className={`flex items-center gap-1 text-sm ${summary.percentChange > 0 ? "text-green-500" : "text-red-500"}`}
                >
                  {summary.percentChange > 0 ? (
                    <TrendingUp className="w-3 h-3" />
                  ) : (
                    <TrendingDown className="w-3 h-3" />
                  )}
                  {summary.percentChange > 0 ? "+" : ""}
                  {summary.percentChange}%
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="h-48 flex items-end gap-1">
        {points.map((point, i) => {
          const heightPercent = (point.newContacts / max) * 100;

          return (
            <div
              key={i}
              className="flex-1 flex flex-col items-center gap-1 group relative"
            >
              <div className="absolute bottom-full mb-2 bg-popover text-popover-foreground text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10 border border-border shadow-md">
                {formatDate(point.period)}: {point.newContacts} new contacts
              </div>
              <div
                className="w-full bg-gradient-to-t from-cyan-600 to-cyan-400 rounded-t min-h-[2px]"
                style={{ height: `${heightPercent}%` }}
              />
            </div>
          );
        })}
      </div>

      <div className="flex justify-between mt-2 text-xs text-muted-foreground">
        <span>{formatDate(points[0]?.period)}</span>
        {points.length > 2 && (
          <span>
            {formatDate(points[Math.floor(points.length / 2)]?.period)}
          </span>
        )}
        <span>{formatDate(points[points.length - 1]?.period)}</span>
      </div>
    </div>
  );
}
