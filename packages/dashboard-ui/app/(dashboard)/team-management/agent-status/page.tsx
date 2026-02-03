"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  agentStatusApi,
  AgentStatusItem,
  AgentSessionWithMetrics,
} from "@/lib/agent-status-api";
import {
  Users,
  Clock,
  ChevronLeft,
  ChevronRight,
  Circle,
  MessageSquare,
  CheckCircle,
} from "lucide-react";

const PAGE_SIZE = 15;

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
  const [sessionPage, setSessionPage] = useState(1);
  const [agentFilter, setAgentFilter] = useState<string>("");

  const {
    data: agents,
    isLoading: agentsLoading,
    error: agentsError,
  } = useQuery({
    queryKey: ["agent-status-list"],
    queryFn: () => agentStatusApi.getAgentStatusList(),
  });

  const {
    data: sessionsData,
    isLoading: sessionsLoading,
    error: sessionsError,
  } = useQuery({
    queryKey: ["agent-status-sessions", sessionPage, agentFilter],
    queryFn: () =>
      agentStatusApi.getSessionHistory({
        page: sessionPage,
        limit: PAGE_SIZE,
        ...(agentFilter ? { agentId: agentFilter } : {}),
      }),
  });

  const totalSessionPages = sessionsData
    ? Math.max(1, Math.ceil(sessionsData.total / sessionsData.limit))
    : 1;
  const canPrevSession = sessionPage > 1;
  const canNextSession = sessionPage < totalSessionPages;

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Agent Status</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          See who is online/offline, when they logged in/out, and session
          metrics (chats received, resolved).
        </p>
      </div>

      {/* Agents list – current status */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle className="text-sm font-medium text-muted flex items-center gap-2">
            <Users className="h-4 w-4" />
            Agents
          </CardTitle>
        </CardHeader>
        <CardContent>
          {agentsError && (
            <p className="text-sm text-destructive py-4">
              {agentsError instanceof Error
                ? agentsError.message
                : "Failed to load agents."}
            </p>
          )}
          {agentsLoading && (
            <p className="text-sm text-muted py-4">Loading agents…</p>
          )}
          {!agentsLoading && !agentsError && agents && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Current session started</TableHead>
                  <TableHead>Last session ended</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agents.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center py-8 text-muted"
                    >
                      No agents found. Add team members to see them here.
                    </TableCell>
                  </TableRow>
                ) : (
                  agents.map((a: AgentStatusItem) => (
                    <TableRow key={a.agentId}>
                      <TableCell className="font-medium">
                        {a.name || "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {a.email}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${
                            a.status === "online"
                              ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                              : a.status === "busy"
                                ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
                                : "bg-muted text-muted-foreground"
                          }`}
                        >
                          <Circle
                            className={`h-2 w-2 fill-current ${
                              a.status === "online"
                                ? "text-green-600"
                                : a.status === "busy"
                                  ? "text-amber-600"
                                  : ""
                            }`}
                          />
                          {a.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {a.currentSessionStartedAt
                          ? formatDate(a.currentSessionStartedAt)
                          : "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {a.lastSessionEndedAt
                          ? formatDate(a.lastSessionEndedAt)
                          : "—"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Session history with metrics */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle className="text-sm font-medium text-muted flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Session history
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
                  {a.name || a.email}
                </option>
              ))}
            </select>
          )}
        </CardHeader>
        <CardContent>
          {sessionsError && (
            <p className="text-sm text-destructive py-4">
              {sessionsError instanceof Error
                ? sessionsError.message
                : "Failed to load sessions."}
            </p>
          )}
          {sessionsLoading && (
            <p className="text-sm text-muted py-4">Loading sessions…</p>
          )}
          {!sessionsLoading && !sessionsError && sessionsData && (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Agent</TableHead>
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
                        colSpan={6}
                        className="text-center py-8 text-muted"
                      >
                        No sessions yet. Agents appear here when they go online
                        and then offline.
                      </TableCell>
                    </TableRow>
                  ) : (
                    sessionsData.data.map((s: AgentSessionWithMetrics) => (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium">
                          {s.agentName || s.agentId.slice(0, 8)}
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
                    ))
                  )}
                </TableBody>
              </Table>
              {sessionsData.data.length > 0 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted">
                    Page {sessionPage} of {totalSessionPages} ·{" "}
                    {sessionsData.total} total
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!canPrevSession}
                      onClick={() => setSessionPage((p) => Math.max(1, p - 1))}
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
  );
}
