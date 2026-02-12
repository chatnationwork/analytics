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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowRightLeft, User, Users, AlertCircle } from "lucide-react";
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
  // Source State
  const [sourceType, setSourceType] = useState<"agent" | "team">("agent");
  const [sourceId, setSourceId] = useState<string>("");

  // Destination State
  const [destType, setDestType] = useState<"agent" | "team">("agent");
  const [destId, setDestId] = useState<string>("");

  // Options
  const [amount, setAmount] = useState<number | "">("");
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setSourceId("");
      setDestId("");
      setAmount("");
      setReason("");
      setIsSubmitting(false);
    }
  }, [open]);

  // Fetch ALL active sessions (assuming permission allows viewing all)
  const { data: allSessions = [], isLoading: isLoadingSessions } = useQuery({
    queryKey: ["agent-inbox-for-bulk-transfer", open],
    queryFn: () => agentApi.getInbox("all"),
    enabled: open,
  });

  // Fetch agents (for source/dest options)
  const { data: agentList = EMPTY_LIST } = useQuery({
    queryKey: ["agent-status-list"],
    queryFn: () => agentStatusApi.getAgentStatusList(),
    enabled: open,
  });

  // Fetch teams (for source/dest options)
  const { data: teams = EMPTY_LIST } = useQuery({
    queryKey: ["teams-available-for-queue"],
    queryFn: () => agentApi.getTeamsAvailableForQueue(),
    enabled: open,
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

  // Filter sessions based on source selection
  const sourceSessions = useMemo(() => {
    if (!sourceId) return [];
    return allSessions.filter((s) => {
      if (sourceType === "agent") {
        return s.assignedAgentId === sourceId && s.status !== "resolved";
      } else {
        // From Team: Unassigned in team queue
        return (
          s.assignedTeamId === sourceId &&
          !s.assignedAgentId &&
          s.status !== "resolved"
        );
      }
    });
  }, [allSessions, sourceType, sourceId]);

  const maxTransferable = sourceSessions.length;

  // Derived options for Source Selects
  const processedAgentList = useMemo(() => {
    // Map available agents from agentList
    return agentList.map((a: any) => ({
      id: a.agentId,
      name: a.name ?? a.email,
      status: a.status,
    }));
  }, [agentList]);

  // For Source Agent, we can also show only agents who actually HAVE chats?
  // Or just show all. Showing all is safer/less confusing.
  
  const handleAmountChange = (val: string) => {
    if (val === "") {
      setAmount("");
      return;
    }
    const num = parseInt(val, 10);
    if (!isNaN(num)) {
      setAmount(Math.min(Math.max(1, num), maxTransferable));
    }
  };

  const handleTransferAll = () => {
    setAmount(maxTransferable);
  };

  const isValid =
    sourceId &&
    destId &&
    (sourceType !== destType || sourceId !== destId) && // Can't transfer to self
    (amount === "" ? false : amount > 0) &&
    (!reasonRequired || reason.trim().length > 0);

  const handleSubmit = async () => {
    if (!isValid) return;
    setIsSubmitting(true);

    try {
      // 1. Identify filtered sessions
      // 2. Slice top N ids
      const sessionsToTransfer = sourceSessions.slice(
        0,
        amount === "" ? 0 : amount,
      );
      const sessionIds = sessionsToTransfer.map((s) => s.id);

      if (sessionIds.length === 0) {
        toast.error("No sessions selected to transfer");
        return;
      }

      // 3. Call API
      const options: any = { reason: reason || undefined };
      if (destType === "agent") {
        options.targetAgentId = destId;
      } else {
        options.targetTeamId = destId;
      }

      const { transferred, errors } = await agentApi.bulkTransferSessions(
        sessionIds,
        options,
      );

      // 4. Handle result
      onOpenChange(false);
      onSuccess?.();

      if (transferred > 0) {
        toast.success(
          `Successfully transferred ${transferred} chat${
            transferred !== 1 ? "s" : ""
          }`,
        );
      } else if (errors.length > 0) {
        toast.error(`Failed to transfer: ${errors[0]?.message}`);
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to execute transfer",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5 text-muted-foreground" />
            Bulk Transfer
          </DialogTitle>
          <DialogDescription>
            Move active chats from one agent or team to another.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="grid grid-cols-[1fr,auto,1fr] gap-4 items-start">
            {/* SOURCE COLUMN */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-muted-foreground">
                From (Source)
              </label>
              <Tabs
                value={sourceType}
                onValueChange={(v) => {
                  setSourceType(v as "agent" | "team");
                  setSourceId("");
                  setAmount("");
                }}
                className="w-full"
              >
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="agent">Agent</TabsTrigger>
                  <TabsTrigger value="team">Team</TabsTrigger>
                </TabsList>
              </Tabs>

              {sourceType === "agent" ? (
                <Select value={sourceId} onValueChange={setSourceId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Agent" />
                  </SelectTrigger>
                  <SelectContent>
                    {processedAgentList.map((agent: any) => (
                      <SelectItem key={agent.id} value={agent.id}>
                        {agent.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Select value={sourceId} onValueChange={setSourceId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Team" />
                  </SelectTrigger>
                  <SelectContent>
                    {teams.map((team: any) => (
                      <SelectItem key={team.teamId} value={team.teamId}>
                        {team.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {sourceId && (
                <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded flex items-center gap-2">
                  <AlertCircle className="h-3 w-3" />
                  <span>
                    {isLoadingSessions ? "Checking..." : `${maxTransferable} chats available`}
                  </span>
                </div>
              )}
            </div>

            {/* ARROW */}
            <div className="flex flex-col justify-center h-full pt-8 text-muted-foreground">
              <ArrowRightLeft className="h-4 w-4" />
            </div>

            {/* DESTINATION COLUMN */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-muted-foreground">
                To (Destination)
              </label>
              <Tabs
                value={destType}
                onValueChange={(v) => {
                  setDestType(v as "agent" | "team");
                  setDestId("");
                }}
                className="w-full"
              >
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="agent">Agent</TabsTrigger>
                  <TabsTrigger value="team">Team</TabsTrigger>
                </TabsList>
              </Tabs>

              {destType === "agent" ? (
                <Select value={destId} onValueChange={setDestId}>
                  <SelectTrigger disabled={!sourceId}>
                    <SelectValue placeholder="Select Agent" />
                  </SelectTrigger>
                  <SelectContent>
                    {processedAgentList
                      .filter((a: any) => 
                        // Prevent selecting same agent if source is agent
                        !(sourceType === 'agent' && sourceId === a.id)
                      )
                      .map((agent: any) => (
                        <SelectItem key={agent.id} value={agent.id}>
                          {agent.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              ) : (
                <Select value={destId} onValueChange={setDestId}>
                  <SelectTrigger disabled={!sourceId}>
                    <SelectValue placeholder="Select Team" />
                  </SelectTrigger>
                  <SelectContent>
                    {teams
                      .filter((t: any) => 
                         // Prevent selecting same team if source is team
                         !(sourceType === 'team' && sourceId === t.teamId)
                      )
                      .map((team: any) => (
                        <SelectItem key={team.teamId} value={team.teamId}>
                          {team.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          <div className="border-t pt-4 space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">
                  Amount to Transfer
                </label>
                {sourceId && maxTransferable > 0 && (
                  <Button
                    variant="link"
                    className="h-auto p-0 text-xs"
                    onClick={handleTransferAll}
                  >
                    Transfer Max ({maxTransferable})
                  </Button>
                )}
              </div>
              <Input
                type="number"
                value={amount}
                onChange={(e) => handleAmountChange(e.target.value)}
                placeholder="0"
                min={1}
                max={maxTransferable || undefined}
                disabled={!sourceId || maxTransferable === 0}
              />
              <p className="text-xs text-muted-foreground">
                Enter the number of chats to move (max {maxTransferable})
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Reason {reasonRequired && <span className="text-destructive">*</span>}
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Why are these chats being transferred?"
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!isValid || isSubmitting}>
            {isSubmitting ? "Transferring..." : "Transfer Chats"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
