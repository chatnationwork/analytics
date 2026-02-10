"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { agentApi, TenantInboxCounts } from "@/lib/api/agent";
import { agentStatusApi } from "@/lib/agent-status-api";
import { Inbox, User, Users } from "lucide-react";

// Stable reference for empty lists to prevent infinite loops in useEffect
const EMPTY_LIST: any[] = [];

export type AssignQueueMode = "auto" | "manual" | "teams";

interface AssignQueueDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called after a successful assign; receives number of chats assigned. */
  onSuccess: (assigned: number) => void;
}

export function AssignQueueDialog({
  open,
  onOpenChange,
  onSuccess,
}: AssignQueueDialogProps) {
  const [mode, setMode] = useState<AssignQueueMode>("auto");
  const [manualCounts, setManualCounts] = useState<Record<string, number>>({});
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const { data: inboxCounts } = useQuery({
    queryKey: ["agent-inbox-counts"],
    queryFn: () => agentApi.getInboxCounts(),
    enabled: open,
  });

  const queueSize = useMemo(() => {
    const counts = inboxCounts as TenantInboxCounts | undefined;
    return counts && "unassigned" in counts ? counts.unassigned : 0;
  }, [inboxCounts]);

  const { data: agentList = EMPTY_LIST } = useQuery({
    queryKey: ["agent-status-list"],
    queryFn: () => agentStatusApi.getAgentStatusList(),
    enabled: open && mode === "manual",
  });

  const { data: availableTeams = EMPTY_LIST } = useQuery({
    queryKey: ["teams-available-for-queue"],
    queryFn: () => agentApi.getTeamsAvailableForQueue(),
    enabled: open && mode === "teams",
  });

  const onlineAgents = useMemo(
    () => agentList.filter((a) => a.status === "online"),
    [agentList],
  );

  const totalManualRequested = useMemo(
    () =>
      onlineAgents.reduce(
        (sum, a) => sum + (manualCounts[a.agentId] ?? 0),
        0,
      ),
    [onlineAgents, manualCounts],
  );

  const manualRemaining = Math.max(0, queueSize - totalManualRequested);

  useEffect(() => {
    if (!open) return;
    if (mode === "manual") {
      setManualCounts((prev) => {
        const next = { ...prev };
        onlineAgents.forEach((a) => {
          if (typeof next[a.agentId] !== "number") next[a.agentId] = 1;
        });
        return next;
      });
    }
    if (mode === "teams") {
      setSelectedTeamIds([]);
    }
  }, [open, mode, onlineAgents]);

  const canAssign =
    queueSize > 0 &&
    (mode === "auto" ||
      (mode === "manual" &&
        onlineAgents.length > 0 &&
        onlineAgents.some((a) => (manualCounts[a.agentId] ?? 0) > 0) &&
        totalManualRequested <= queueSize) ||
      (mode === "teams" && selectedTeamIds.length > 0));

  const handleAssign = async () => {
    if (!canAssign) return;
    setLoading(true);
    try {
      let assigned = 0;
      if (mode === "auto") {
        const res = await agentApi.assignQueue({ mode: "auto" });
        assigned = res.assigned;
        onOpenChange(false);
        onSuccess(assigned);
        return;
      }
      if (mode === "manual") {
        const assignments = onlineAgents
          .filter((a) => (manualCounts[a.agentId] ?? 0) > 0)
          .map((a) => ({
            agentId: a.agentId,
            count: manualCounts[a.agentId]!,
          }));
        const res = await agentApi.assignQueue({
          mode: "manual",
          assignments,
        });
        assigned = res.assigned;
        onOpenChange(false);
        onSuccess(assigned);
        return;
      }
      if (mode === "teams") {
        const res = await agentApi.assignQueue({
          mode: "teams",
          teamIds: selectedTeamIds,
        });
        assigned = res.assigned;
        onOpenChange(false);
        onSuccess(assigned);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to assign queue");
    } finally {
      setLoading(false);
    }
  };

  const toggleTeam = (teamId: string) => {
    setSelectedTeamIds((prev) =>
      prev.includes(teamId)
        ? prev.filter((id) => id !== teamId)
        : [...prev, teamId],
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Assign queue</DialogTitle>
          <DialogDescription>
            Choose how to assign unassigned chats from the queue to agents.
          </DialogDescription>
        </DialogHeader>

        {queueSize === 0 && (
          <p className="text-sm text-muted-foreground rounded-md bg-muted/50 p-3">
            There are no chats to assign.
          </p>
        )}

        {queueSize > 0 && (
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{queueSize}</span>{" "}
            chat{queueSize !== 1 ? "s" : ""} in queue.
          </p>
        )}

        <div className="space-y-4 py-2">
          {/* Mode: auto */}
          <label className="flex items-start gap-3 rounded-lg border p-3 cursor-pointer hover:bg-muted/50 has-checked:border-primary has-checked:bg-primary/5">
            <input
              type="radio"
              name="assign-mode"
              checked={mode === "auto"}
              onChange={() => setMode("auto")}
              className="mt-1 h-4 w-4"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2 font-medium">
                <Inbox className="h-4 w-4 text-muted-foreground" />
                Let the system assign
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">
                Chats are distributed to available (online) agents using your
                team routing rules.
              </p>
            </div>
          </label>

          {/* Mode: manual */}
          <label className="flex items-start gap-3 rounded-lg border p-3 cursor-pointer hover:bg-muted/50 has-checked:border-primary has-checked:bg-primary/5">
            <input
              type="radio"
              name="assign-mode"
              checked={mode === "manual"}
              onChange={() => setMode("manual")}
              className="mt-1 h-4 w-4"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2 font-medium">
                <User className="h-4 w-4 text-muted-foreground" />
                Assign to specific agents
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">
                Pick one or more agents and how many chats to assign to each.
              </p>
            </div>
          </label>

          {mode === "manual" && (
            <div className="ml-6 pl-1 space-y-2 border-l-2 border-muted">
              {onlineAgents.length === 0 ? (
                <p className="text-sm text-amber-600 dark:text-amber-500">
                  No agents in shift. Only online agents can receive
                  assignments.
                </p>
              ) : (
                <>
                  <p className="text-xs text-muted-foreground">
                    {totalManualRequested} of {queueSize} chats assigned to
                    agents
                    {manualRemaining > 0 && (
                      <span> ({manualRemaining} remaining)</span>
                    )}
                    {totalManualRequested > queueSize && (
                      <span className="text-destructive">
                        {" "}
                        — reduce total to {queueSize} or less
                      </span>
                    )}
                  </p>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {onlineAgents.map((agent) => {
                      const current = manualCounts[agent.agentId] ?? 0;
                      const othersTotal =
                        totalManualRequested - current;
                      const maxForThis = Math.max(
                        0,
                        queueSize - othersTotal,
                      );
                      return (
                        <div
                          key={agent.agentId}
                          className="flex items-center gap-2 text-sm"
                        >
                          <span className="flex-1 truncate">
                            {agent.name ?? agent.email}
                          </span>
                          <Label
                            htmlFor={`count-${agent.agentId}`}
                            className="sr-only"
                          >
                            Chats to assign
                          </Label>
                          <Input
                            id={`count-${agent.agentId}`}
                            type="number"
                            min={0}
                            max={maxForThis}
                            value={manualCounts[agent.agentId] ?? 0}
                            onChange={(e) => {
                              const raw = parseInt(
                                e.target.value,
                                10,
                              );
                              const value = Number.isNaN(raw)
                                ? 0
                                : Math.max(0, raw);
                              setManualCounts((prev) => ({
                                ...prev,
                                [agent.agentId]: Math.min(
                                  value,
                                  maxForThis,
                                ),
                              }));
                            }}
                            className="w-20 h-8 text-sm"
                          />
                          <span className="text-muted-foreground">
                            chats (max {maxForThis})
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Mode: teams */}
          <label className="flex items-start gap-3 rounded-lg border p-3 cursor-pointer hover:bg-muted/50 has-checked:border-primary has-checked:bg-primary/5">
            <input
              type="radio"
              name="assign-mode"
              checked={mode === "teams"}
              onChange={() => setMode("teams")}
              className="mt-1 h-4 w-4"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2 font-medium">
                <Users className="h-4 w-4 text-muted-foreground" />
                Assign to teams
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">
                Distribute the queue across one or more teams (with an active
                shift and members).
              </p>
            </div>
          </label>

          {mode === "teams" && (
            <div className="ml-6 pl-1 space-y-2 border-l-2 border-muted">
              {availableTeams.length === 0 ? (
                <p className="text-sm text-amber-600 dark:text-amber-500">
                  No teams with an active shift and members. Add a schedule or
                  members to teams.
                </p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {availableTeams.map((team) => (
                    <label
                      key={team.teamId}
                      className="flex items-center gap-2 text-sm cursor-pointer"
                    >
                      <Checkbox
                        checked={selectedTeamIds.includes(team.teamId)}
                        onCheckedChange={() => toggleTeam(team.teamId)}
                      />
                      <span>
                        {team.name}{" "}
                        <span className="text-muted-foreground">
                          ({team.memberCount}{" "}
                          {team.memberCount === 1 ? "member" : "members"})
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button onClick={handleAssign} disabled={!canAssign || loading}>
            {loading ? (
              <span className="inline-flex items-center gap-1.5">
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Assigning…
              </span>
            ) : (
              "Assign"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
