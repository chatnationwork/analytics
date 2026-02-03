"use client";

/**
 * AI & Intents Analytics – AI classification, intents, and latency.
 * Dedicated page for AI performance (moved from WhatsApp Analytics).
 */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { aiAnalyticsApi } from "@/lib/ai-analytics-api";
import * as aiTrendsApi from "@/lib/ai-trends-api";
import {
  Brain,
  Target,
  Zap,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { RouteGuard } from "@/components/auth/RouteGuard";

type Granularity = "day" | "week" | "month";

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

function IntentBreakdown({
  data,
}: {
  data: { intent: string; count: number; avgConfidence: number }[];
}) {
  if (!data.length) {
    return (
      <div className="text-muted-foreground text-sm text-center py-8">
        No AI classification data yet
      </div>
    );
  }
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <div className="space-y-2 max-h-64 overflow-y-auto">
      {data.map((item) => (
        <div key={item.intent} className="flex items-center gap-3">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-foreground">
                {item.intent.replace(/_/g, " ")}
              </span>
              <span className="text-xs text-muted-foreground">
                {item.count}{" "}
                <span className="text-purple-500">
                  ({(item.avgConfidence * 100).toFixed(0)}%)
                </span>
              </span>
            </div>
            <div className="h-2 bg-muted rounded overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-purple-400 rounded"
                style={{ width: `${(item.count / max) * 100}%` }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function AiLatencyChart({
  data,
}: {
  data: { bucket: string; count: number }[];
}) {
  if (!data.length || data.every((d) => d.count === 0)) {
    return (
      <div className="text-muted-foreground text-sm text-center py-8">
        No AI latency data yet
      </div>
    );
  }
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <div className="h-32 flex items-end gap-2">
      {data.map((item, i) => (
        <div
          key={item.bucket}
          className="flex-1 flex flex-col items-center gap-1 group relative"
        >
          <div
            className={`w-full rounded-t min-h-[2px] ${i < 3 ? "bg-gradient-to-t from-green-600 to-green-400" : "bg-gradient-to-t from-amber-600 to-amber-400"}`}
            style={{ height: `${(item.count / max) * 100}%` }}
          />
          <span className="text-[9px] text-muted-foreground">
            {item.bucket}ms
          </span>
        </div>
      ))}
    </div>
  );
}

function AiClassificationTrendChart({
  data,
}: {
  data: aiTrendsApi.ClassificationTrendDataPoint[];
}) {
  if (!data?.length) {
    return (
      <div className="h-40 flex items-center justify-center text-muted-foreground text-sm">
        No classification data available
      </div>
    );
  }
  const max = Math.max(...data.map((d) => d.classifications)) || 1;
  return (
    <div className="space-y-2">
      <div className="h-40 flex items-end gap-1">
        {data.map((point, i) => {
          const heightPercent = (point.classifications / max) * 100;
          const errorHeightPercent =
            point.classifications > 0
              ? (point.errors / point.classifications) * heightPercent
              : 0;
          return (
            <div
              key={i}
              className="flex-1 flex flex-col items-center gap-1 group relative"
            >
              <div className="w-full flex flex-col">
                <div
                  className="w-full bg-red-500 rounded-t"
                  style={{ height: `${errorHeightPercent * 1.5}px` }}
                />
                <div
                  className="w-full bg-purple-500"
                  style={{
                    height: `${(heightPercent - errorHeightPercent) * 1.5}px`,
                    minHeight: "2px",
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{formatDate(data[0]?.period)}</span>
        <span>{formatDate(data[data.length - 1]?.period)}</span>
      </div>
    </div>
  );
}

function AiLatencyTrendChart({
  data,
}: {
  data: aiTrendsApi.LatencyTrendDataPoint[];
}) {
  if (!data?.length) {
    return (
      <div className="h-40 flex items-center justify-center text-muted-foreground text-sm">
        No latency data available
      </div>
    );
  }
  const maxP95 = Math.max(...data.map((d) => d.p95Latency)) || 1;
  return (
    <div className="space-y-2">
      <div className="h-40 flex items-end gap-1">
        {data.map((point, i) => {
          const p50Height = (point.p50Latency / maxP95) * 100;
          const p95Height = (point.p95Latency / maxP95) * 100;
          return (
            <div
              key={i}
              className="flex-1 flex flex-col items-center group relative"
            >
              <div className="w-full relative">
                <div
                  className="w-full bg-amber-300/50 rounded-t absolute bottom-0"
                  style={{ height: `${p95Height * 1.5}px` }}
                />
                <div
                  className="w-full bg-amber-500 rounded-t relative"
                  style={{ height: `${p50Height * 1.5}px`, minHeight: "2px" }}
                />
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{formatDate(data[0]?.period)}</span>
        <span>{formatDate(data[data.length - 1]?.period)}</span>
      </div>
    </div>
  );
}

export default function AiAnalyticsPage() {
  const [granularity, setGranularity] = useState<Granularity>("day");
  const periods = granularity === "day" ? 30 : granularity === "week" ? 12 : 12;

  const { data: aiStats } = useQuery({
    queryKey: ["ai-stats"],
    queryFn: () => aiAnalyticsApi.getStats(),
  });

  const { data: aiIntents } = useQuery({
    queryKey: ["ai-intents"],
    queryFn: () => aiAnalyticsApi.getIntents(),
  });

  const { data: aiLatency } = useQuery({
    queryKey: ["ai-latency"],
    queryFn: () => aiAnalyticsApi.getLatency(),
  });

  const { data: classificationTrend } = useQuery({
    queryKey: ["ai-classification-trend", granularity, periods],
    queryFn: () => aiTrendsApi.getClassificationTrend(granularity, periods),
  });

  const { data: aiLatencyTrend } = useQuery({
    queryKey: ["ai-latency-trend", granularity, periods],
    queryFn: () => aiTrendsApi.getLatencyTrend(granularity, periods),
  });

  return (
    <RouteGuard permission="analytics.view">
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-semibold text-foreground">
            AI & Intents
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            AI classification, intents, and latency
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="AI Classifications"
            value={aiStats?.totalClassifications?.toLocaleString() ?? "0"}
            change="Last 30 days"
            positive
            icon={<Brain className="w-4 h-4" />}
          />
          <StatCard
            label="AI Accuracy"
            value={`${((aiStats?.avgConfidence ?? 0) * 100).toFixed(0)}%`}
            change="Avg confidence"
            positive={(aiStats?.avgConfidence ?? 0) > 0.8}
            icon={<Target className="w-4 h-4" />}
          />
          <StatCard
            label="Avg Latency"
            value={`${Math.round(aiStats?.avgLatencyMs ?? 0)}ms`}
            change={(aiStats?.avgLatencyMs ?? 0) < 500 ? "Fast" : "Check"}
            positive={(aiStats?.avgLatencyMs ?? 0) < 500}
            icon={<Zap className="w-4 h-4" />}
          />
          <StatCard
            label="Error Rate"
            value={`${(aiStats?.errorRate ?? 0).toFixed(1)}%`}
            change={`${aiStats?.errorCount ?? 0} errors`}
            positive={(aiStats?.errorRate ?? 0) < 5}
            icon={<AlertTriangle className="w-4 h-4" />}
          />
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
            <h3 className="font-medium text-foreground mb-6">
              Top User Intents
            </h3>
            <IntentBreakdown data={aiIntents ?? []} />
          </div>
          <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
            <h3 className="font-medium text-foreground mb-6">
              AI Latency Distribution
            </h3>
            <AiLatencyChart data={aiLatency ?? []} />
          </div>
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
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-foreground">
                AI Classification Trend
              </h3>
              {classificationTrend?.summary && (
                <span
                  className={`text-sm font-medium flex items-center gap-1 ${
                    classificationTrend.summary.percentChange >= 0
                      ? "text-green-500"
                      : "text-red-500"
                  }`}
                >
                  {classificationTrend.summary.percentChange >= 0 ? (
                    <TrendingUp className="w-3 h-3" />
                  ) : (
                    <TrendingDown className="w-3 h-3" />
                  )}
                  {classificationTrend.summary.percentChange >= 0 ? "+" : ""}
                  {classificationTrend.summary.percentChange.toFixed(1)}%
                </span>
              )}
            </div>
            <AiClassificationTrendChart
              data={classificationTrend?.data ?? []}
            />
          </div>
          <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-foreground">AI Latency Trend</h3>
              {aiLatencyTrend?.summary && (
                <div className="text-right">
                  <div className="text-lg font-bold text-foreground">
                    {Math.round(aiLatencyTrend.summary.avgP50Latency)}ms
                  </div>
                  <div className="text-xs text-muted-foreground">Avg P50</div>
                </div>
              )}
            </div>
            <AiLatencyTrendChart data={aiLatencyTrend?.data ?? []} />
          </div>
        </div>
      </div>
    </RouteGuard>
  );
}
