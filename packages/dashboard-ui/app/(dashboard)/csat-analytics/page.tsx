"use client";

/**
 * CSAT Analytics – customer satisfaction after chat resolution.
 * Mock data until CSAT events/API are added.
 */

import { Star, MessageSquare, TrendingUp, ThumbsUp } from "lucide-react";
import { RouteGuard } from "@/components/auth/RouteGuard";

// Mock data – replace with real API when CSAT events are available
const MOCK_AVG_SCORE = 4.2;
const MOCK_RESPONSE_RATE = 0.35;
const MOCK_DISTRIBUTION = [
  { stars: 5, count: 120, pct: 48 },
  { stars: 4, count: 65, pct: 26 },
  { stars: 3, count: 35, pct: 14 },
  { stars: 2, count: 18, pct: 7 },
  { stars: 1, count: 12, pct: 5 },
];
const MOCK_FEEDBACK = [
  {
    score: 5,
    text: "Very helpful, issue resolved quickly.",
    date: "2025-02-02",
  },
  {
    score: 4,
    text: "Good support. Would have liked faster first response.",
    date: "2025-02-01",
  },
  { score: 5, text: "Excellent!", date: "2025-01-31" },
  { score: 3, text: "It was okay.", date: "2025-01-30" },
  {
    score: 5,
    text: "Agent was professional and solved my problem.",
    date: "2025-01-29",
  },
];

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

export default function CsatAnalyticsPage() {
  return (
    <RouteGuard permission="analytics.view">
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-semibold text-foreground">
            CSAT Analytics
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Customer satisfaction after chat resolution. Mock data until CSAT
            events are added.
          </p>
        </div>

        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-muted-foreground">
          This page shows mock data. Connect CSAT survey responses or resolution
          events with <code className="text-foreground">csatScore</code> /{" "}
          <code className="text-foreground">csatFeedback</code> to display real
          metrics.
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Average CSAT"
            value={MOCK_AVG_SCORE.toFixed(1)}
            sub="Out of 5"
            icon={<Star className="w-4 h-4 text-amber-500" />}
          />
          <StatCard
            label="Response Rate"
            value={`${(MOCK_RESPONSE_RATE * 100).toFixed(0)}%`}
            sub="Surveys completed"
            icon={<MessageSquare className="w-4 h-4 text-muted-foreground" />}
          />
          <StatCard
            label="5-Star %"
            value={`${MOCK_DISTRIBUTION[0].pct}%`}
            sub="Top rating"
            icon={<ThumbsUp className="w-4 h-4 text-muted-foreground" />}
          />
          <StatCard
            label="Trend"
            value="—"
            sub="Connect API for trend"
            icon={<TrendingUp className="w-4 h-4 text-muted-foreground" />}
          />
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
            <h3 className="font-medium text-foreground mb-6">
              Score Distribution
            </h3>
            <div className="space-y-3">
              {MOCK_DISTRIBUTION.map((row) => (
                <div key={row.stars} className="flex items-center gap-3">
                  <div className="flex items-center gap-1 w-16">
                    {Array.from({ length: row.stars }).map((_, i) => (
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
                        style={{ width: `${row.pct}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-sm text-muted-foreground w-16 text-right">
                    {row.count} ({row.pct}%)
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
            <h3 className="font-medium text-foreground mb-6">
              Recent Feedback
            </h3>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {MOCK_FEEDBACK.map((f, i) => (
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
                            j < f.score
                              ? "fill-amber-500 text-amber-500"
                              : "text-muted-foreground/40"
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {f.date}
                    </span>
                  </div>
                  <p className="text-sm text-foreground">{f.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </RouteGuard>
  );
}
