"use client";

import { useState, useMemo, useEffect } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ArrowRightLeft, Search, User, Users } from "lucide-react";
import { toast } from "sonner";
import { agentApi } from "@/lib/api/agent";
import { api } from "@/lib/api";
import { agentStatusApi } from "@/lib/agent-status-api";

interface BulkTransferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

// Stable empty list to prevent infinite loops in useEffect
const EMPTY_LIST: any[] = [];

export function BulkTransferDialog({
  open,
  onOpenChange,
  onSuccess,
}: BulkTransferDialogProps) {
  const [selectedSessionIds, setSelectedSessionIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [destinationType, setDestinationType] = useState<"agent" | "team">(
    "agent",
  );
  const [agentCounts, setAgentCounts] = useState<Record<string, number>>({});
  const [teamCounts, setTeamCounts] = useState<Record<string, number>>({});
  const [reason, setReason] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch assigned sessions for selection
  const { data: sessions = [] } = useQuery({
    queryKey: ["agent-inbox-for-bulk-transfer", open],
    queryFn: () => agentApi.getInbox("all"),
    enabled: open,
  });

  const assignableSessions = useMemo(
    () => sessions.filter((s) => s.status === "assigned"),
    [sessions],
  );

  // Fetch agents (online agents for manual assignment)
  const { data: agentList = EMPTY_LIST } = useQuery({
    queryKey: ["agent-status-list"],
    queryFn: () => agentStatusApi.getAgentStatusList(),
    enabled: open && destinationType === "agent",
  });

  const onlineAgents = useMemo(
    () => agentList.filter((a: any) => a.status === "online"),
    [agentList],
  );

  // Fetch available teams
  const { data: availableTeams = EMPTY_LIST } = useQuery({
    queryKey: ["teams-available-for-queue"],
    queryFn: () => agentApi.getTeamsAvailableForQueue(),
    enabled: open && destinationType === "team",
  });

  // Fetch tenant settings (for transferReasonRequired)
  const { data: tenant } = useQuery({
    queryKey: ["tenant"],
    queryFn: () => api.getCurrentTenant(),
    enabled: open,
  });

  const reasonRequired =
    (tenant?.settings as { transferReasonRequired?: boolean } | undefined)
      ?.transferReasonRequired === true;

  // Filter agents by search
  const filteredAgents = useMemo(
    () =>
      onlineAgents.filter(
        (a: any) =>
          (a.name ?? "").toLowerCase().includes(searchQuery.toLowerCase()) ||
          (a.email ?? "").toLowerCase().includes(searchQuery.toLowerCase()),
      ),
    [onlineAgents, searchQuery],
  );

  const totalSelected = selectedSessionIds.size;

  // Total agent counts
  const totalAgentRequested = useMemo(
    () =>
      onlineAgents.reduce(
        (sum: number, a: any) => sum + (agentCounts[a.agentId] ?? 0),
        0,
      ),
    [onlineAgents, agentCounts],
  );

  // Total team counts
  const totalTeamRequested = useMemo(
    () =>
      availableTeams.reduce(
        (sum: number, t: any) => sum + (teamCounts[t.teamId] ?? 0),
        0,
      ),
    [availableTeams, teamCounts],
  );

  const totalRequested =
    destinationType === "agent" ? totalAgentRequested : totalTeamRequested;
  const remaining = Math.max(0, totalSelected - totalRequested);

  // Init counts when agents/teams change
  useEffect(() => {
    if (!open) return;
    if (destinationType === "agent") {
      setAgentCounts((prev) => {
        const next = { ...prev };
        onlineAgents.forEach((a: any) => {
          if (typeof next[a.agentId] !== "number") next[a.agentId] = 0;
        });
        return next;
      });
    }
    if (destinationType === "team") {
      setTeamCounts((prev) => {
        const next = { ...prev };
        availableTeams.forEach((t: any) => {
          if (typeof next[t.teamId] !== "number") next[t.teamId] = 0;
        });
        return next;
      });
    }
  }, [open, destinationType, onlineAgents, availableTeams]);

  // Session selection helpers
  const toggleSession = (sessionId: string) => {
    setSelectedSessionIds((prev) => {
      const next = new Set(prev);
      if (next.has(sessionId)) next.delete(sessionId);
      else next.add(sessionId);
      return next;
    });
  };

  const selectAll = () => {
    setSelectedSessionIds(new Set(assignableSessions.map((s) => s.id)));
  };

  const clearSelection = () => setSelectedSessionIds(new Set());

  const canSubmit =
    totalSelected > 0 &&
    totalRequested > 0 &&
    totalRequested <= totalSelected &&
    (!reasonRequired || reason.trim().length > 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setIsSubmitting(true);
    try {
      const ids = Array.from(selectedSessionIds);

      if (destinationType === "agent") {
        const agentAssignments = onlineAgents
          .filter((a: any) => (agentCounts[a.agentId] ?? 0) > 0)
          .map((a: any) => ({
            agentId: a.agentId as string,
            count: agentCounts[a.agentId]!,
          }));

        const { transferred, errors } = await agentApi.bulkTransferSessions(
          ids,
          { agentAssignments, reason: reason || undefined },
        );
        handleResult(transferred, errors);
      } else {
        const teamAssignments = availableTeams
          .filter((t: any) => (teamCounts[t.teamId] ?? 0) > 0)
          .map((t: any) => ({
            teamId: t.teamId as string,
            count: teamCounts[t.teamId]!,
          }));

        const { transferred, errors } = await agentApi.bulkTransferSessions(
          ids,
          { teamAssignments, reason: reason || undefined },
        );
        handleResult(transferred, errors);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to transfer");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResult = (
    transferred: number,
    errors: Array<{ sessionId: string; message: string }>,
  ) => {
    onOpenChange(false);
    setSelectedSessionIds(new Set());
    setAgentCounts({});
    setTeamCounts({});
    setReason("");
    setSearchQuery("");
    onSuccess?.();
    if (transferred > 0) {
      toast.success(`${transferred} chat(s) transferred`);
    }
    if (errors.length > 0 && transferred === 0) {
      toast.error(errors[0]?.message ?? "Failed to transfer");
    } else if (errors.length > 0) {
      toast.warning(`${transferred} transferred; ${errors.length} failed`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5 text-muted-foreground" />
            Bulk transfer
          </DialogTitle>
          <DialogDescription>
            Select assigned chats and distribute them across agents or teams.
            Requires session.bulk_transfer permission.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-4 flex-1 min-h-0 overflow-hidden"
        >
          {/* Session list */}
          <div className="space-y-2 min-h-0 flex flex-col">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-foreground">
                Chats to transfer
              </label>
              <div className="flex gap-2 text-xs">
                <button
                  type="button"
                  onClick={selectAll}
                  className="text-primary hover:underline"
                >
                  Select all
                </button>
                <button
                  type="button"
                  onClick={clearSelection}
                  className="text-muted-foreground hover:underline"
                >
                  Clear
                </button>
              </div>
            </div>
            <div className="border border-border rounded-md overflow-y-auto max-h-40 p-1">
              {assignableSessions.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  No assigned chats to transfer.
                </div>
              ) : (
                assignableSessions.map((session) => (
                  <label
                    key={session.id}
                    className="flex items-center gap-2 p-2 rounded hover:bg-muted/50 cursor-pointer text-sm"
                  >
                    <Checkbox
                      checked={selectedSessionIds.has(session.id)}
                      onCheckedChange={() => toggleSession(session.id)}
                    />
                    <span className="truncate">
                      {session.contactName || session.contactId}
                    </span>
                  </label>
                ))
              )}
            </div>
            {totalSelected > 0 && (
              <p className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">
                  {totalSelected}
                </span>{" "}
                chat{totalSelected !== 1 ? "s" : ""} selected
              </p>
            )}
          </div>

          {/* Destination: agent or team */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Transfer to <span className="text-destructive">*</span>
            </label>
            <div className="flex rounded-lg border border-border p-1 bg-muted/30">
              <button
                type="button"
                onClick={() => {
                  setDestinationType("agent");
                  setTeamCounts({});
                }}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-colors ${
                  destinationType === "agent"
                    ? "bg-background shadow text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <User className="h-4 w-4" />
                Agents
              </button>
              <button
                type="button"
                onClick={() => {
                  setDestinationType("team");
                  setAgentCounts({});
                }}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-colors ${
                  destinationType === "team"
                    ? "bg-background shadow text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Users className="h-4 w-4" />
                Teams
              </button>
            </div>

            {destinationType === "agent" ? (
              <div className="space-y-2">
                {/* Agent search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search agents..."
                    className="w-full pl-9 pr-3 py-2 bg-background border border-input rounded-md text-sm"
                  />
                </div>

                {/* Counter */}
                {totalSelected > 0 && onlineAgents.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {totalAgentRequested} of {totalSelected} chats assigned to
                    agents
                    {remaining > 0 && (
                      <span> ({remaining} remaining)</span>
                    )}
                    {totalAgentRequested > totalSelected && (
                      <span className="text-destructive">
                        {" "}
                        — reduce total to {totalSelected} or less
                      </span>
                    )}
                  </p>
                )}

                {/* Agent list with count inputs */}
                <div className="border border-border rounded-md overflow-y-auto max-h-40 p-1">
                  {onlineAgents.length === 0 ? (
                    <div className="p-3 text-center text-sm text-muted-foreground">
                      No online agents available
                    </div>
                  ) : filteredAgents.length === 0 ? (
                    <div className="p-3 text-center text-sm text-muted-foreground">
                      No agents match your search
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {filteredAgents.map((agent: any) => {
                        const current = agentCounts[agent.agentId] ?? 0;
                        const othersTotal = totalAgentRequested - current;
                        const maxForThis = Math.max(
                          0,
                          totalSelected - othersTotal,
                        );
                        return (
                          <div
                            key={agent.agentId}
                            className="flex items-center gap-2 p-2 text-sm"
                          >
                            <User className="h-4 w-4 text-muted-foreground shrink-0" />
                            <span className="flex-1 truncate">
                              {agent.name ?? agent.email}
                            </span>
                            <Label
                              htmlFor={`agent-count-${agent.agentId}`}
                              className="sr-only"
                            >
                              Chats to transfer
                            </Label>
                            <Input
                              id={`agent-count-${agent.agentId}`}
                              type="number"
                              min={0}
                              max={maxForThis}
                              value={agentCounts[agent.agentId] ?? 0}
                              onChange={(e) => {
                                const raw = parseInt(e.target.value, 10);
                                const value = Number.isNaN(raw)
                                  ? 0
                                  : Math.max(0, raw);
                                setAgentCounts((prev) => ({
                                  ...prev,
                                  [agent.agentId]: Math.min(value, maxForThis),
                                }));
                              }}
                              className="w-20 h-8 text-sm"
                            />
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                              chats
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {/* Counter */}
                {totalSelected > 0 && availableTeams.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {totalTeamRequested} of {totalSelected} chats assigned to
                    teams
                    {remaining > 0 && (
                      <span> ({remaining} remaining)</span>
                    )}
                    {totalTeamRequested > totalSelected && (
                      <span className="text-destructive">
                        {" "}
                        — reduce total to {totalSelected} or less
                      </span>
                    )}
                  </p>
                )}

                {/* Team list with count inputs */}
                <div className="border border-border rounded-md overflow-y-auto max-h-40 p-1">
                  {availableTeams.length === 0 ? (
                    <div className="p-3 text-center text-sm text-muted-foreground">
                      No teams available (need at least one member and an active
                      shift)
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {availableTeams.map((team: any) => {
                        const current = teamCounts[team.teamId] ?? 0;
                        const othersTotal = totalTeamRequested - current;
                        const maxForThis = Math.max(
                          0,
                          totalSelected - othersTotal,
                        );
                        return (
                          <div
                            key={team.teamId}
                            className="flex items-center gap-2 p-2 text-sm"
                          >
                            <Users className="h-4 w-4 text-muted-foreground shrink-0" />
                            <div className="flex-1 min-w-0">
                              <span className="truncate block">
                                {team.name}
                              </span>
                              {team.memberCount != null && (
                                <span className="text-xs text-muted-foreground">
                                  {team.memberCount} member
                                  {team.memberCount !== 1 ? "s" : ""}
                                </span>
                              )}
                            </div>
                            <Label
                              htmlFor={`team-count-${team.teamId}`}
                              className="sr-only"
                            >
                              Chats to transfer
                            </Label>
                            <Input
                              id={`team-count-${team.teamId}`}
                              type="number"
                              min={0}
                              max={maxForThis}
                              value={teamCounts[team.teamId] ?? 0}
                              onChange={(e) => {
                                const raw = parseInt(e.target.value, 10);
                                const value = Number.isNaN(raw)
                                  ? 0
                                  : Math.max(0, raw);
                                setTeamCounts((prev) => ({
                                  ...prev,
                                  [team.teamId]: Math.min(value, maxForThis),
                                }));
                              }}
                              className="w-20 h-8 text-sm"
                            />
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                              chats
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Reason */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-foreground">
              Reason {reasonRequired ? "(required)" : "(optional)"}
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why are you transferring these chats?"
              rows={2}
              required={reasonRequired}
              className="w-full px-3 py-2 bg-background border border-input rounded-md text-sm resize-none"
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!canSubmit || isSubmitting}>
              {isSubmitting
                ? "Transferring…"
                : `Transfer ${totalRequested} chat(s)`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
