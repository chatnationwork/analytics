"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Users,
  ChevronLeft,
  ChevronRight,
  Circle,
  MessageSquare,
  CheckCircle,
  LogIn,
  Download,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { RouteGuard } from "@/components/auth/RouteGuard";
import {
  agentStatusApi,
  AgentStatusItem,
  AgentSessionWithMetrics,
} from "@/lib/agent-status-api";

const SESSION_PAGE_SIZE = 15;

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

function formatDuration(minutes: number | null) {
  if (minutes == null) return "—";
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

export default function AgentStatusPage() {
  const [agentFilter, setAgentFilter] = useState<string>("");
  const [sessionPage, setSessionPage] = useState(1);
  const queryClient = useQueryClient();
  const [presenceUpdating, setPresenceUpdating] = useState<string | null>(null);

  const {
    data: agents,
    isLoading: agentsLoading,
    error: agentsError,
  } = useQuery({
    queryKey: ["agent-status-list"],
    queryFn: () => agentStatusApi.getAgentStatusList(),
  });

  const handleSetPresence = async (
    agentId: string,
    status: "online" | "offline",
  ) => {
    setPresenceUpdating(agentId);
    try {
      await agentStatusApi.setPresence(agentId, status);
      await queryClient.invalidateQueries({ queryKey: ["agent-status-list"] });
    } catch (err) {
      console.error(err);
    } finally {
      setPresenceUpdating(null);
    }
  };

  const {
    data: sessionsData,
    isLoading: sessionsLoading,
    error: sessionsError,
  } = useQuery({
    queryKey: ["agent-status-sessions", sessionPage, agentFilter],
    queryFn: () =>
      agentStatusApi.getSessionHistory({
        page: sessionPage,
        limit: SESSION_PAGE_SIZE,
        ...(agentFilter ? { agentId: agentFilter } : {}),
      }),
  });

  const totalSessionPages = sessionsData
    ? Math.max(1, Math.ceil(sessionsData.total / sessionsData.limit))
    : 1;
  const canPrevSession = sessionPage > 1;
  const canNextSession = sessionPage < totalSessionPages;

  const exportMutation = useMutation({
    mutationFn: () =>
      agentStatusApi.exportAgentLogs(
        agentFilter ? { agentId: agentFilter } : undefined,
      ),
    onSuccess: (blob) => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `agent-logs-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success("Agent logs exported successfully");
    },
    onError: () => {
      toast.error("Failed to export agent logs");
    },
  });

  return (
    <RouteGuard permission="teams.manage">
      <div className="p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">
              Agent Logs
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Agent presence and session history (logins, chats received, and
              resolved).
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => exportMutation.mutate()}
            disabled={exportMutation.isPending}
          >
            {exportMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            Export
          </Button>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" />
              Agent status & session history
            </CardTitle>
            {agents && agents.length > 0 && (
              <select
                aria-label="Filter by agent"
                className="text-sm border rounded-md px-2 py-1 bg-background"
                value={agentFilter}
                onChange={(e) => {
                  setAgentFilter(e.target.value);
                  setSessionPage(1);
                }}
              >
                <option value="">All agents</option>
                {agents.map((a: AgentStatusItem) => (
                  <option key={a.agentId} value={a.agentId}>
                    {a.name || a.agentId.slice(0, 8)}
                  </option>
                ))}
              </select>
            )}
          </CardHeader>
          <CardContent>
            {(agentsError || sessionsError) && (
              <p className="text-sm text-destructive py-4">
                {agentsError instanceof Error
                  ? agentsError.message
                  : sessionsError instanceof Error
                    ? sessionsError.message
                    : "Failed to load data."}
              </p>
            )}
            {(agentsLoading || sessionsLoading) && (
              <p className="text-sm text-muted-foreground py-4">Loading…</p>
            )}
            {!agentsLoading &&
              !sessionsLoading &&
              !agentsError &&
              !sessionsError &&
              agents &&
              sessionsData && (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Agent</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-center">
                          <LogIn className="h-4 w-4 inline mr-1" />
                          Times logged in
                        </TableHead>
                        <TableHead>Started</TableHead>
                        <TableHead>Ended</TableHead>
                        <TableHead>Duration</TableHead>
                        <TableHead className="text-center">
                          <MessageSquare className="h-4 w-4 inline mr-1" />
                          Chats received
                        </TableHead>
                        <TableHead className="text-center">
                          <CheckCircle className="h-4 w-4 inline mr-1" />
                          Chats resolved
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sessionsData.data.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={8}
                            className="text-center py-8 text-muted-foreground"
                          >
                            No sessions yet. Agents appear here when they go
                            online and then offline.
                          </TableCell>
                        </TableRow>
                      ) : (
                        sessionsData.data.map((s: AgentSessionWithMetrics) => {
                          const agent = agents.find(
                            (a: AgentStatusItem) => a.agentId === s.agentId,
                          );
                          const sessionStatus = s.endedAt ? "offline" : "online";
                          const isOnline = sessionStatus === "online";
                          return (
                            <TableRow key={s.id}>
                              <TableCell className="font-medium">
                                {s.agentName ||
                                  agent?.name ||
                                  s.agentId.slice(0, 8)}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <span
                                    className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                                      isOnline
                                        ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                                        : "bg-muted text-muted-foreground"
                                    }`}
                                  >
                                    <Circle
                                      className={`h-2 w-2 fill-current ${
                                        isOnline ? "text-green-600" : ""
                                      }`}
                                    />
                                    {sessionStatus}
                                  </span>
                                  {agent && (
                                    <select
                                      aria-label={`Set ${s.agentName || agent?.name} status`}
                                      value={isOnline ? "online" : "offline"}
                                      onChange={(e) => {
                                        const v = e.target.value as
                                          | "online"
                                          | "offline";
                                        if (
                                          v !==
                                          (isOnline ? "online" : "offline")
                                        )
                                          handleSetPresence(s.agentId, v);
                                      }}
                                      disabled={presenceUpdating === s.agentId}
                                      className="text-sm border rounded px-2 py-1 bg-background disabled:opacity-50"
                                    >
                                      <option value="online">Online</option>
                                      <option value="offline">Offline</option>
                                    </select>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="text-center text-muted-foreground">
                                {s.loginCount}
                              </TableCell>
                              <TableCell className="text-muted-foreground">
                                {formatDate(s.startedAt)}
                              </TableCell>
                              <TableCell className="text-muted-foreground">
                                {s.endedAt ? formatDate(s.endedAt) : "Online"}
                              </TableCell>
                              <TableCell>
                                {formatDuration(s.durationMinutes)}
                              </TableCell>
                              <TableCell className="text-center">
                                {s.chatsReceived}
                              </TableCell>
                              <TableCell className="text-center">
                                {s.chatsResolved}
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                  {sessionsData.data.length > 0 && (
                    <div className="flex items-center justify-between mt-4">
                      <p className="text-sm text-muted-foreground">
                        Page {sessionPage} of {totalSessionPages} ·{" "}
                        {sessionsData.total} total
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={!canPrevSession}
                          onClick={() =>
                            setSessionPage((p) => Math.max(1, p - 1))
                          }
                        >
                          <ChevronLeft className="h-4 w-4" /> Previous
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={!canNextSession}
                          onClick={() =>
                            setSessionPage((p) =>
                              Math.min(totalSessionPages, p + 1),
                            )
                          }
                        >
                          Next <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
          </CardContent>
        </Card>
      </div>
    </RouteGuard>
  );
}
