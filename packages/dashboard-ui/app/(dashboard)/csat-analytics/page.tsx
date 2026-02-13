"use client";

/**
 * CSAT Analytics – customer satisfaction after chat resolution.
 * Uses live data from csat_submitted events.
 */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Star, MessageSquare, TrendingUp, ThumbsUp } from "lucide-react";
import { RouteGuard } from "@/components/auth/RouteGuard";
import {
  getCsatDashboard,
  getCsatByJourney,
  getCsatTrend,
  type CsatGranularity,
  type CsatByJourneyItem,
} from "@/lib/csat-analytics-api";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  ComposedChart
} from "recharts";

function getJourneyLabel(journey: string): string {
  if (journey === "Unknown" || !journey) return "Other";
  return journey.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function StatCard({
  label,
  value,
  sub,
  icon,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <span className="text-muted-foreground text-sm">{label}</span>
        {icon}
      </div>
      <div className="text-2xl font-bold text-foreground mb-1">{value}</div>
      {sub && <div className="text-sm text-muted-foreground">{sub}</div>}
    </div>
  );
}

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

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

const PRESETS = [
  { label: "Today", days: 0 },
  { label: "Last 7 days", days: 7 },
  { label: "Last 30 days", days: 30 },
  { label: "Last 90 days", days: 90 },
] as const;

export default function CsatAnalyticsPage() {
  const granularity: CsatGranularity = "day";
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

  const { data, isLoading, error } = useQuery({
    queryKey: ["csat-dashboard", granularity, periods, dateStart, dateEnd],
    queryFn: () => getCsatDashboard(granularity, periods, dateStart, dateEnd),
  });

  const { data: byJourneyData } = useQuery({
    queryKey: ["csat-by-journey", granularity, periods, dateStart, dateEnd],
    queryFn: () => getCsatByJourney(granularity, periods, dateStart, dateEnd),
  });

  const { data: trendData } = useQuery({
    queryKey: ["csat-trend", granularity, periods, dateStart, dateEnd],
    queryFn: () => getCsatTrend(granularity, periods, dateStart, dateEnd),
  });

  const summary = data?.summary;
  const recentFeedback = data?.recentFeedback ?? [];
  const distribution = summary?.distribution ?? [];
  const byJourney = byJourneyData?.data ?? [];

  return (
    <RouteGuard permission="analytics.view">
      <div className="space-y-6">
        <div className="flex flex-col gap-4">
          <div>
            <h1 className="text-xl font-semibold text-foreground">
              CSAT Analytics
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {dateRangeLabel}
            </p>
          </div>
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

        {error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error instanceof Error
              ? error.message
              : "Failed to load CSAT data"}
          </div>
        )}

        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="bg-card rounded-xl border border-border p-5 animate-pulse"
              >
                <div className="h-4 w-24 bg-muted rounded mb-3" />
                <div className="h-8 w-16 bg-muted rounded mb-2" />
                <div className="h-3 w-20 bg-muted rounded" />
              </div>
            ))}
          </div>
        )}

        {!isLoading && !error && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <StatCard
                label="Total Sent"
                value={
                  summary?.totalSent?.toLocaleString() ??
                  (summary?.totalResponses ? "—" : "0")
                }
                sub="Surveys sent"
                icon={<MessageSquare className="w-4 h-4 text-primary" />}
              />
              <StatCard
                label="Total responses"
                value={summary?.totalResponses?.toLocaleString() ?? "0"}
                sub="Surveys completed"
                icon={
                  <MessageSquare className="w-4 h-4 text-muted-foreground" />
                }
              />
              <StatCard
                label="Response Rate"
                value={
                   summary?.totalSent && summary.totalSent > 0
                    ? `${((summary.totalResponses / summary.totalSent) * 100).toFixed(1)}%`
                    : "0%"
                }
                sub="Completion rate"
                icon={<TrendingUp className="w-4 h-4 text-green-500" />}
              />
              <StatCard
                label="Average CSAT"
                value={
                  summary?.totalResponses
                    ? summary.averageScore.toFixed(1)
                    : "—"
                }
                sub="Out of 5"
                icon={<Star className="w-4 h-4 text-amber-500" />}
              />
              <StatCard
                label="5-Star %"
                value={
                  summary?.totalResponses ? `${summary.fiveStarPercent}%` : "—"
                }
                sub="Top rating"
                icon={<ThumbsUp className="w-4 h-4 text-muted-foreground" />}
              />
            </div>

            {/* CSAT Trend Chart */}
            <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
              <h3 className="font-medium text-foreground mb-6">
                CSAT Trend
              </h3>
              {trendData?.data?.length === 0 ? (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground text-sm">
                  No trend data available for this period
                </div>
              ) : (
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={trendData?.data}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis 
                        dataKey="period" 
                        fontSize={12} 
                        tickLine={false} 
                        axisLine={false}
                        tickFormatter={(v) => v.slice(5)} // Show MM-DD
                      />
                      <YAxis 
                        yAxisId="left"
                        domain={[0, 5]} 
                        fontSize={12} 
                        tickLine={false} 
                        axisLine={false}
                        label={{ value: 'Score', angle: -90, position: 'insideLeft' }}
                      />
                      <YAxis 
                        yAxisId="right"
                        orientation="right"
                        fontSize={12} 
                        tickLine={false} 
                        axisLine={false}
                        label={{ value: 'Responses', angle: 90, position: 'insideRight' }}
                      />
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}
                        itemStyle={{ color: 'hsl(var(--foreground))' }}
                      />
                      <Bar yAxisId="right" dataKey="responseCount" fill="hsl(var(--primary) / 0.2)" radius={[4, 4, 0, 0]} name="Responses" />
                      <Line 
                        yAxisId="left"
                        type="monotone" 
                        dataKey="averageScore" 
                        stroke="hsl(var(--primary))" 
                        strokeWidth={2}
                        dot={{ r: 4, fill: "hsl(var(--primary))" }}
                        name="Avg Score"
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
                <h3 className="font-medium text-foreground mb-6">
                  Score Distribution
                </h3>
                {distribution.length === 0 && !summary?.totalResponses ? (
                  <p className="text-sm text-muted-foreground">
                    No CSAT responses yet. Send csat_submitted events with
                    properties.rating (1–5) to see distribution.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {distribution.map((row) => (
                      <div key={row.score} className="flex items-center gap-3">
                        <div className="flex items-center gap-1 w-16">
                          {Array.from({ length: row.score }).map((_, i) => (
                            <Star
                              key={i}
                              className="w-4 h-4 fill-amber-500 text-amber-500"
                            />
                          ))}
                        </div>
                        <div className="flex-1">
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-amber-500 rounded-full"
                              style={{
                                width: `${row.percentage}%`,
                              }}
                            />
                          </div>
                        </div>
                        <span className="text-sm text-muted-foreground w-16 text-right">
                          {row.count} ({row.percentage}%)
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
                <h3 className="font-medium text-foreground mb-6">
                  Recent Feedback
                </h3>
                {recentFeedback.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No feedback yet. Send csat_submitted events with
                    properties.feedback to see comments here.
                  </p>
                ) : (
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {recentFeedback.map((f, i) => (
                      <div
                        key={i}
                        className="p-3 rounded-lg bg-muted/50 border border-border/50"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex gap-0.5">
                            {Array.from({ length: 5 }).map((_, j) => (
                              <Star
                                key={j}
                                className={`w-3.5 h-3.5 ${
                                  j < f.rating
                                    ? "fill-amber-500 text-amber-500"
                                    : "text-muted-foreground/40"
                                }`}
                              />
                            ))}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {formatDate(f.timestamp)}
                          </span>
                        </div>
                        <p className="text-sm text-foreground">
                          {f.feedback ?? "—"}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* CSAT per journey */}
            <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
              <h3 className="font-medium text-foreground mb-2">
                CSAT per Journey
              </h3>
              <p className="text-sm text-muted-foreground mb-6">
                Satisfaction by journey step
              </p>
              {byJourney.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No CSAT by journey yet.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-3 px-2 font-medium text-foreground">
                          Journey
                        </th>
                        <th className="text-right py-3 px-2 font-medium text-foreground">
                          Responses
                        </th>
                        <th className="text-right py-3 px-2 font-medium text-foreground">
                          Avg
                        </th>
                        <th className="text-right py-3 px-2 font-medium text-foreground">
                          5-Star %
                        </th>
                        <th className="text-left py-3 px-2 font-medium text-foreground min-w-[140px]">
                          Distribution
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {byJourney.map((row: CsatByJourneyItem) => (
                        <tr
                          key={row.journey}
                          className="border-b border-border/50"
                        >
                          <td className="py-3 px-2 text-foreground">
                            {getJourneyLabel(row.journey)}
                          </td>
                          <td className="py-3 px-2 text-right text-muted-foreground">
                            {row.totalResponses.toLocaleString()}
                          </td>
                          <td className="py-3 px-2 text-right text-foreground">
                            {row.averageScore.toFixed(1)}
                          </td>
                          <td className="py-3 px-2 text-right text-muted-foreground">
                            {row.fiveStarPercent}%
                          </td>
                          <td className="py-3 px-2">
                            <div className="flex gap-0.5 items-center min-w-[120px]">
                              {[1, 2, 3, 4, 5].map((score) => (
                                <div
                                  key={score}
                                  className="h-2 flex-1 rounded-sm bg-muted overflow-hidden"
                                  title={`${score}: ${row.distribution.find((d) => d.score === score)?.count ?? 0}`}
                                >
                                  <div
                                    className="h-full bg-amber-500 rounded-sm"
                                    style={{
                                      width: `${row.distribution.find((d) => d.score === score)?.percentage ?? 0}%`,
                                    }}
                                  />
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </RouteGuard>
  );
}
