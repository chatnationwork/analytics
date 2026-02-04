"use client";

/**
 * Wrap-up Reports Analytics – resolution categories and wrap-up outcomes.
 * Uses agent-inbox-analytics resolution by category and trend.
 */

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  getResolutionOverview,
  getResolutionTrend,
  getResolutionByCategory,
  getResolutionSubmissions,
  type Granularity,
  type ResolutionTrendDataPoint,
  type ResolutionCategoryItem,
  type ResolutionSubmissionItem,
} from "@/lib/agent-inbox-analytics-api";
import { CheckCircle, TrendingUp, FileText } from "lucide-react";
import { RouteGuard } from "@/components/auth/RouteGuard";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChatWindow } from "@/components/agent-inbox/ChatWindow";
import { agentApi, type Message } from "@/lib/api/agent";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";

function formatDate(d: string) {
  return new Date(d).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function formatDateTime(d: string): string {
  try {
    const dt = new Date(d);
    return dt.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return d;
  }
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
  const [submissionsPage, setSubmissionsPage] = useState(1);
  const submissionsLimit = 20;
  const [selected, setSelected] = useState<ResolutionSubmissionItem | null>(
    null,
  );
  const [detailsTab, setDetailsTab] = useState<"report" | "chat">("report");
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>("");

  useEffect(() => {
    authClient
      .getProfile()
      .then((u) => setCurrentUserId(u.id))
      .catch(() => setCurrentUserId(""));
  }, []);

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

  const { data: submissions, isLoading: submissionsLoading } = useQuery({
    queryKey: [
      "wrap-up-submissions",
      granularity,
      periods,
      submissionsPage,
      submissionsLimit,
    ],
    queryFn: () =>
      getResolutionSubmissions(
        granularity,
        periods,
        submissionsPage,
        submissionsLimit,
      ),
  });

  const totalPages = useMemo(() => {
    const total = submissions?.total ?? 0;
    return Math.max(Math.ceil(total / submissionsLimit), 1);
  }, [submissions?.total]);

  const selectedTitle = selected
    ? selected.contactName || selected.contactId
    : "Wrap-up submission";

  const formEntries = useMemo(() => {
    if (!selected?.formData) return [];
    return Object.entries(selected.formData).sort(([a], [b]) =>
      a.localeCompare(b),
    );
  }, [selected?.formData]);

  const loadChat = async (sessionId: string) => {
    setChatLoading(true);
    try {
      const res = await agentApi.getSession(sessionId);
      setChatMessages(Array.isArray(res?.messages) ? res.messages : []);
    } catch (e) {
      setChatMessages([]);
      toast.error(e instanceof Error ? e.message : "Failed to load chat");
    } finally {
      setChatLoading(false);
    }
  };

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

        <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                Wrap-up submissions
              </h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                View each individual wrap-up report and the chat it was filed
                for.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={submissionsPage <= 1}
                onClick={() => setSubmissionsPage((p) => Math.max(p - 1, 1))}
              >
                Previous
              </Button>
              <span className="text-xs text-muted-foreground">
                Page {submissionsPage} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={submissionsPage >= totalPages}
                onClick={() =>
                  setSubmissionsPage((p) => Math.min(p + 1, totalPages))
                }
              >
                Next
              </Button>
            </div>
          </div>

          {submissionsLoading ? (
            <div className="h-32 flex items-center justify-center text-muted-foreground text-sm">
              Loading submissions…
            </div>
          ) : (submissions?.data?.length ?? 0) === 0 ? (
            <div className="h-32 flex items-center justify-center text-muted-foreground text-sm">
              No wrap-up submissions found for this period.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Contact</TableHead>
                  <TableHead>Agent</TableHead>
                  <TableHead>Resolved at</TableHead>
                  <TableHead>Outcome</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(submissions?.data ?? []).map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="min-w-[180px]">
                      <div className="font-medium text-foreground truncate">
                        {s.contactName || s.contactId}
                      </div>
                      <div className="text-xs text-muted-foreground font-mono truncate">
                        {s.contactId}
                      </div>
                    </TableCell>
                    <TableCell className="min-w-[140px]">
                      <div className="text-sm text-foreground truncate">
                        {s.resolvedByAgentName ?? "Unknown"}
                      </div>
                      <div className="text-xs text-muted-foreground font-mono truncate">
                        {s.resolvedByAgentId}
                      </div>
                    </TableCell>
                    <TableCell className="min-w-[160px] text-sm text-muted-foreground">
                      {formatDateTime(s.createdAt)}
                    </TableCell>
                    <TableCell className="text-sm">{s.outcome}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {s.category}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelected(s);
                          setDetailsTab("report");
                          setChatMessages([]);
                        }}
                      >
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        <Dialog
          open={selected != null}
          onOpenChange={(open) => {
            if (!open) {
              setSelected(null);
              setChatMessages([]);
              setDetailsTab("report");
            }
          }}
        >
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>{selectedTitle}</DialogTitle>
              <DialogDescription>
                {selected ? (
                  <>
                    Session:{" "}
                    <span className="font-mono">{selected.sessionId}</span> ·
                    Resolved by{" "}
                    <span className="font-medium">
                      {selected.resolvedByAgentName ?? "Unknown"}
                    </span>{" "}
                    · {formatDateTime(selected.createdAt)}
                  </>
                ) : null}
              </DialogDescription>
            </DialogHeader>

            {selected && (
              <Tabs
                value={detailsTab}
                onValueChange={(v) => setDetailsTab(v as "report" | "chat")}
              >
                <TabsList>
                  <TabsTrigger value="report">Report</TabsTrigger>
                  <TabsTrigger
                    value="chat"
                    onClick={() => {
                      if (selected && chatMessages.length === 0 && !chatLoading)
                        loadChat(selected.sessionId);
                    }}
                  >
                    Chat
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="report" className="mt-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <Card className="p-4">
                      <h3 className="text-sm font-semibold text-foreground mb-2">
                        Resolution
                      </h3>
                      <dl className="text-sm space-y-1.5">
                        <div className="flex items-start justify-between gap-4">
                          <dt className="text-muted-foreground">Outcome</dt>
                          <dd className="text-foreground font-medium">
                            {selected.outcome}
                          </dd>
                        </div>
                        <div className="flex items-start justify-between gap-4">
                          <dt className="text-muted-foreground">Category</dt>
                          <dd className="text-foreground">
                            {selected.category}
                          </dd>
                        </div>
                      </dl>
                      {selected.notes && (
                        <div className="mt-3">
                          <div className="text-xs text-muted-foreground mb-1">
                            Notes
                          </div>
                          <div className="text-sm whitespace-pre-wrap rounded-md border border-border bg-muted/30 p-2">
                            {selected.notes}
                          </div>
                        </div>
                      )}
                    </Card>

                    <Card className="p-4">
                      <h3 className="text-sm font-semibold text-foreground mb-2">
                        Wrap-up form data
                      </h3>
                      {formEntries.length === 0 ? (
                        <div className="text-sm text-muted-foreground">
                          No wrap-up form fields were captured for this
                          resolution.
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {formEntries.map(([k, v]) => (
                            <div
                              key={k}
                              className="rounded-md border border-border bg-muted/20 p-2"
                            >
                              <div className="text-xs text-muted-foreground font-mono">
                                {k}
                              </div>
                              <div className="text-sm text-foreground break-words">
                                {String(v)}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="chat" className="mt-4">
                  <div className="rounded-xl border border-border overflow-hidden h-[520px] flex flex-col">
                    {chatLoading ? (
                      <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
                        Loading chat…
                      </div>
                    ) : (
                      <ChatWindow
                        messages={chatMessages}
                        currentUserId={currentUserId}
                      />
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </RouteGuard>
  );
}
