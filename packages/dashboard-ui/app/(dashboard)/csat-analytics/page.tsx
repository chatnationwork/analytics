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
  type CsatGranularity,
} from "@/lib/csat-analytics-api";

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

export default function CsatAnalyticsPage() {
  const [granularity, setGranularity] = useState<CsatGranularity>("day");
  const periods = granularity === "day" ? 30 : granularity === "week" ? 12 : 6;

  const { data, isLoading, error } = useQuery({
    queryKey: ["csat-dashboard", granularity, periods],
    queryFn: () => getCsatDashboard(granularity, periods),
  });

  const summary = data?.summary;
  const recentFeedback = data?.recentFeedback ?? [];
  const distribution = summary?.distribution ?? [];

  return (
    <RouteGuard permission="analytics.view">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-foreground">
              CSAT Analytics
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Customer satisfaction from csat_submitted events (rating &
              feedback)
            </p>
          </div>
          <select
            value={granularity}
            onChange={(e) =>
              setGranularity(e.target.value as CsatGranularity)
            }
            className="bg-card border border-border rounded-lg px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            aria-label="Time range"
          >
            <option value="day">Last 30 days</option>
            <option value="week">Last 12 weeks</option>
            <option value="month">Last 6 months</option>
          </select>
        </div>

        {error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error instanceof Error ? error.message : "Failed to load CSAT data"}
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
                label="Total responses"
                value={summary?.totalResponses?.toLocaleString() ?? "0"}
                sub="Surveys completed"
                icon={
                  <MessageSquare className="w-4 h-4 text-muted-foreground" />
                }
              />
              <StatCard
                label="5-Star %"
                value={
                  summary?.totalResponses
                    ? `${summary.fiveStarPercent}%`
                    : "—"
                }
                sub="Top rating"
                icon={
                  <ThumbsUp className="w-4 h-4 text-muted-foreground" />
                }
              />
              <StatCard
                label="Trend"
                value={
                  summary?.percentChange != null
                    ? `${summary.percentChange >= 0 ? "+" : ""}${summary.percentChange.toFixed(1)}%`
                    : "—"
                }
                sub="vs previous period"
                icon={
                  <TrendingUp className="w-4 h-4 text-muted-foreground" />
                }
              />
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
                      <div
                        key={row.score}
                        className="flex items-center gap-3"
                      >
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
          </>
        )}
      </div>
    </RouteGuard>
  );
}
