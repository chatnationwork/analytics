"use client";

import { useState, useMemo } from "react";
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
import { ArrowRightLeft, Search, User, Users } from "lucide-react";
import { toast } from "sonner";
import { agentApi } from "@/lib/api/agent";
import { api } from "@/lib/api";

interface BulkTransferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

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
  const [selectedAgentId, setSelectedAgentId] = useState("");
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [reason, setReason] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: sessions = [] } = useQuery({
    queryKey: ["agent-inbox-for-bulk-transfer", open],
    queryFn: () => agentApi.getInbox("all"),
    enabled: open,
  });

  const assignableSessions = useMemo(
    () => sessions.filter((s) => s.status === "assigned"),
    [sessions],
  );

  const { data: agents = [] } = useQuery({
    queryKey: ["available-agents-bulk-transfer", open],
    queryFn: () => agentApi.getAvailableAgents(),
    enabled: open,
  });

  const { data: teams = [] } = useQuery({
    queryKey: ["teams-bulk-transfer", open],
    queryFn: () => agentApi.getTeams(),
    enabled: open,
  });

  const { data: tenant } = useQuery({
    queryKey: ["tenant"],
    queryFn: () => api.getCurrentTenant(),
    enabled: open,
  });

  const reasonRequired =
    (tenant?.settings as { transferReasonRequired?: boolean } | undefined)
      ?.transferReasonRequired === true;

  const filteredAgents = useMemo(
    () =>
      agents.filter(
        (a) =>
          a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          a.email.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
    [agents, searchQuery],
  );

  const selectedAgent = agents.find((a) => a.id === selectedAgentId);
  const selectedTeam = teams.find((t) => t.id === selectedTeamId);

  const toggleSession = (sessionId: string) => {
    setSelectedSessionIds((prev) => {
      const next = new Set(prev);
      if (next.has(sessionId)) next.delete(sessionId);
      else next.add(sessionId);
      return next;
    });
  };

  const selectAll = () => {
    setSelectedSessionIds(
      new Set(assignableSessions.map((s) => s.id)),
    );
  };

  const clearSelection = () => setSelectedSessionIds(new Set());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const toAgent = destinationType === "agent" && selectedAgentId;
    const toTeam = destinationType === "team" && selectedTeamId;
    if ((!toAgent && !toTeam) || selectedSessionIds.size === 0) return;
    if (reasonRequired && !reason.trim()) return;

    setIsSubmitting(true);
    try {
      const ids = Array.from(selectedSessionIds);
      const { transferred, errors } = await agentApi.bulkTransferSessions(
        ids,
        {
          ...(toAgent && { targetAgentId: selectedAgentId }),
          ...(toTeam && { targetTeamId: selectedTeamId }),
          reason: reason || undefined,
        },
      );
      onOpenChange(false);
      setSelectedSessionIds(new Set());
      setSelectedAgentId("");
      setSelectedTeamId("");
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
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to transfer");
    } finally {
      setIsSubmitting(false);
    }
  };

  const canSubmit =
    selectedSessionIds.size > 0 &&
    (destinationType === "agent"
      ? !!selectedAgentId
      : !!selectedTeamId) &&
    (!reasonRequired || reason.trim().length > 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5 text-muted-foreground" />
            Bulk transfer
          </DialogTitle>
          <DialogDescription>
            Select assigned chats and transfer them to an agent or to a team
            queue. Requires session.bulk_transfer permission.
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
                  setSelectedTeamId("");
                }}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-colors ${
                  destinationType === "agent"
                    ? "bg-background shadow text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <User className="h-4 w-4" />
                Agent
              </button>
              <button
                type="button"
                onClick={() => {
                  setDestinationType("team");
                  setSelectedAgentId("");
                }}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-colors ${
                  destinationType === "team"
                    ? "bg-background shadow text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Users className="h-4 w-4" />
                Team
              </button>
            </div>

            {destinationType === "agent" ? (
              <>
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
                <div className="border border-border rounded-md overflow-y-auto max-h-36">
                  {filteredAgents.length === 0 ? (
                    <div className="p-3 text-center text-sm text-muted-foreground">
                      {searchQuery ? "No agents found" : "No available agents"}
                    </div>
                  ) : (
                    filteredAgents.map((agent) => (
                      <button
                        key={agent.id}
                        type="button"
                        onClick={() => setSelectedAgentId(agent.id)}
                        className={`w-full flex items-center gap-3 p-3 text-left text-sm hover:bg-muted/50 transition-colors ${
                          selectedAgentId === agent.id
                            ? "bg-primary/10 border-l-2 border-primary"
                            : ""
                        }`}
                      >
                        <User className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="font-medium truncate">
                            {agent.name}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {agent.email}
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
                {selectedAgent && (
                  <div className="p-2 bg-muted/50 rounded-md text-sm flex items-center gap-2">
                    <User className="h-4 w-4 text-primary shrink-0" />
                    <span>
                      Transferring to: {selectedAgent.name} (
                      {selectedAgent.email})
                    </span>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="border border-border rounded-md overflow-y-auto max-h-36">
                  {teams.length === 0 ? (
                    <div className="p-3 text-center text-sm text-muted-foreground">
                      No teams available
                    </div>
                  ) : (
                    teams.map((team) => (
                      <button
                        key={team.id}
                        type="button"
                        onClick={() => setSelectedTeamId(team.id)}
                        className={`w-full flex items-center gap-3 p-3 text-left text-sm hover:bg-muted/50 transition-colors ${
                          selectedTeamId === team.id
                            ? "bg-primary/10 border-l-2 border-primary"
                            : ""
                        }`}
                      >
                        <Users className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="font-medium truncate">
                            {team.name}
                          </div>
                          {team.memberCount != null && (
                            <div className="text-xs text-muted-foreground">
                              {team.memberCount} member
                              {team.memberCount !== 1 ? "s" : ""}
                            </div>
                          )}
                        </div>
                      </button>
                    ))
                  )}
                </div>
                {selectedTeam && (
                  <div className="p-2 bg-muted/50 rounded-md text-sm flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary shrink-0" />
                    <span>
                      Transferring to team: {selectedTeam.name}
                    </span>
                  </div>
                )}
              </>
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
            <Button
              type="submit"
              disabled={!canSubmit || isSubmitting}
            >
              {isSubmitting
                ? "Transferring…"
                : `Transfer ${selectedSessionIds.size} chat(s)`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
