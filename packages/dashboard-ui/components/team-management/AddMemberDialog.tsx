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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { agentApi } from "@/lib/api/agent";
import { toast } from "sonner";

interface AddMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamId: string;
  teamName: string;
  onSuccess: () => void;
}

export function AddMemberDialog({
  open,
  onOpenChange,
  teamId,
  teamName,
  onSuccess,
}: AddMemberDialogProps) {
  const [userId, setUserId] = useState("");
  const [role, setRole] = useState("agent");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: availableMembers = [], isLoading: loadingAvailable } = useQuery(
    {
      queryKey: ["agent-teams-available-members"],
      queryFn: () => agentApi.getAvailableMembersForTeam(),
      enabled: open,
    },
  );

  const { data: currentTeamMembers = [], isLoading: loadingTeam } = useQuery({
    queryKey: ["agent-teams-members", teamId],
    queryFn: () => agentApi.getTeamMembers(teamId),
    enabled: open && !!teamId,
  });

  const currentMemberIds = useMemo(
    () => new Set(currentTeamMembers.map((m) => m.userId)),
    [currentTeamMembers],
  );

  const dropdownOptions = useMemo(
    () => availableMembers.filter((m) => !currentMemberIds.has(m.userId)),
    [availableMembers, currentMemberIds],
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId.trim()) return;

    setIsSubmitting(true);
    try {
      await agentApi.addMember(teamId, userId, role);
      onSuccess();
      onOpenChange(false);
      setUserId("");
      setRole("agent");
      toast.success("Member added successfully");
    } catch (error) {
      console.error("Failed to add member:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to add member",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLoading = loadingAvailable || loadingTeam;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Member to {teamName}</DialogTitle>
          <DialogDescription>
            Choose a workspace member to add to this team. Only members with the
            "Agent" role who are not already in this team are listed.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="member">Member</Label>
              <Select
                value={userId}
                onValueChange={setUserId}
                disabled={isLoading}
                required
              >
                <SelectTrigger id="member">
                  <SelectValue
                    placeholder={
                      isLoading
                        ? "Loading…"
                        : dropdownOptions.length === 0
                          ? "No members available to add"
                          : "Select a member"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {dropdownOptions.map((m) => (
                    <SelectItem key={m.userId} value={m.userId}>
                      {m.name && m.name !== "Unknown"
                        ? `${m.name} (${m.email})`
                        : m.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                <a
                  href="/settings/people"
                  className="text-primary hover:underline"
                >
                  Invite or manage workspace members
                </a>{" "}
                if someone is missing.
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="role">Team Role</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger id="role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="agent">Agent (Handle Chats)</SelectItem>
                  <SelectItem value="manager">Manager (Manage Team)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !userId || dropdownOptions.length === 0}
            >
              {isSubmitting ? "Adding…" : "Add Member"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
