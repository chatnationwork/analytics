"use client";

import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
  Plus,
  Users,
  ChevronLeft,
  ChevronRight,
  Circle,
  MessageSquare,
  CheckCircle,
  LogIn,
  Inbox,
} from "lucide-react";
import { toast } from "sonner";
import { agentApi, Team } from "@/lib/api/agent";
import { CreateTeamDialog } from "@/components/team-management/CreateTeamDialog";
import {
  TeamList,
  type TeamQueueStats,
} from "@/components/team-management/TeamList";
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

export default function TeamManagementPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [sessionPage, setSessionPage] = useState(1);
  const [agentFilter, setAgentFilter] = useState<string>("");

  const fetchTeams = async () => {
    try {
      setLoading(true);
      const data = await agentApi.getTeams();
      setTeams(data);
    } catch (error) {
      console.error("Failed to fetch teams:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeams();
  }, []);

  const { data: queueStats = [] } = useQuery({
    queryKey: ["agent-teams-queue-stats"],
    queryFn: () => agentApi.getQueueStats(),
  });
  const queueStatsByTeamId: Record<string, TeamQueueStats> = Object.fromEntries(
    queueStats.map((s) => [
      s.teamId,
      {
        queueSize: s.queueSize,
        avgWaitTimeMinutes: s.avgWaitTimeMinutes,
        longestWaitTimeMinutes: s.longestWaitTimeMinutes,
      },
    ]),
  );

  const queryClient = useQueryClient();
  const [presenceUpdating, setPresenceUpdating] = useState<string | null>(null);
  const [assignQueueLoading, setAssignQueueLoading] = useState(false);

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

  return (
    <RouteGuard permission="teams.manage">
      <div className="p-8 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">
              Team Management
            </h2>
            <p className="text-muted-foreground">
              Manage support teams and agent assignments.
            </p>
          </div>
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Create Team
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {loading ? (
            <div>Loading teams...</div>
          ) : teams.length === 0 ? (
            <Card className="col-span-full p-8 text-center text-muted-foreground border-dashed">
              <Users className="mx-auto h-8 w-8 mb-2 opacity-50" />
              No teams found. Create your first team to get started.
            </Card>
          ) : (
            <TeamList
              teams={teams}
              queueStatsByTeamId={queueStatsByTeamId}
              onTeamUpdated={fetchTeams}
            />
          )}
        </div>

        {/* Scheduling & queue */}
        <div className="space-y-6">
          <h3 className="text-xl font-semibold text-foreground">
            Scheduling & Queue
          </h3>
          <p className="text-sm text-muted-foreground -mt-4">
            Assign unassigned chats in the queue to available (online) agents.
            Queue assignment also runs automatically when an agent goes online.
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={assignQueueLoading}
              onClick={async () => {
                setAssignQueueLoading(true);
                try {
                  const { assigned } = await agentApi.assignQueue();
                  await Promise.all([
                    queryClient.invalidateQueries({
                      queryKey: ["agent-teams-queue-stats"],
                    }),
                    queryClient.invalidateQueries({
                      queryKey: ["agent-status-list"],
                    }),
                    queryClient.invalidateQueries({
                      queryKey: ["agent-status-sessions"],
                    }),
                  ]);
                  if (assigned > 0) {
                    toast.success(`${assigned} chat(s) assigned from queue`);
                  } else {
                    toast.info(
                      "No queued chats to assign or no agents available",
                    );
                  }
                } catch (e) {
                  toast.error(
                    e instanceof Error ? e.message : "Failed to assign queue",
                  );
                } finally {
                  setAssignQueueLoading(false);
                }
              }}
            >
              {assignQueueLoading ? (
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Assigning…
                </span>
              ) : (
                <>
                  <Inbox className="h-4 w-4 mr-1.5" />
                  Assign queue
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Agent Status – single table: status + session history */}
        <div className="space-y-6">
          <h3 className="text-xl font-semibold text-foreground">
            Agent Status
          </h3>
          <p className="text-sm text-muted-foreground -mt-4">
            Session history with current status. Use the dropdown to set an
            agent online/offline.
          </p>

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
                          sessionsData.data.map(
                            (s: AgentSessionWithMetrics) => {
                              const agent = agents.find(
                                (a: AgentStatusItem) => a.agentId === s.agentId,
                              );
                              const status = agent?.status ?? "—";
                              const isOnline = status === "online";
                              return (
                                <TableRow key={s.id}>
                                  <TableCell className="font-medium">
                                    {s.agentName ||
                                      agent?.name ||
                                      s.agentId.slice(0, 8)}
                                  </TableCell>
                                  <TableCell>
                                    {agent ? (
                                      <div className="flex items-center gap-2">
                                        <span
                                          className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${
                                            isOnline
                                              ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                                              : status === "busy"
                                                ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
                                                : "bg-muted text-muted-foreground"
                                          }`}
                                        >
                                          <Circle
                                            className={`h-2 w-2 fill-current ${
                                              isOnline
                                                ? "text-green-600"
                                                : status === "busy"
                                                  ? "text-amber-600"
                                                  : ""
                                            }`}
                                          />
                                          {status}
                                        </span>
                                        <select
                                          aria-label={`Set ${s.agentName || agent?.name} status`}
                                          value={
                                            isOnline ? "online" : "offline"
                                          }
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
                                          disabled={
                                            presenceUpdating === s.agentId
                                          }
                                          className="text-sm border rounded px-2 py-1 bg-background disabled:opacity-50"
                                        >
                                          <option value="online">Online</option>
                                          <option value="offline">
                                            Offline
                                          </option>
                                        </select>
                                      </div>
                                    ) : (
                                      "—"
                                    )}
                                  </TableCell>
                                  <TableCell className="text-center text-muted-foreground">
                                    {s.loginCount}
                                  </TableCell>
                                  <TableCell className="text-muted-foreground">
                                    {formatDate(s.startedAt)}
                                  </TableCell>
                                  <TableCell className="text-muted-foreground">
                                    {s.endedAt
                                      ? formatDate(s.endedAt)
                                      : "Online"}
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
                            },
                          )
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

        <CreateTeamDialog
          open={isCreateOpen}
          onOpenChange={setIsCreateOpen}
          onSuccess={fetchTeams}
        />
      </div>
    </RouteGuard>
  );
}
