import { Team, agentApi } from "@/lib/api/agent";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  Plus,
  Star,
  Inbox,
  Clock,
  CheckCircle,
  MessageSquare,
} from "lucide-react";
import { useState } from "react";
import { AddMemberDialog } from "./AddMemberDialog";
import { ManageTeamDialog } from "./ManageTeamDialog";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export interface TeamQueueStats {
  queueSize: number;
  activeChats: number;
  agentCount: number;
  avgWaitTimeMinutes: number | null;
  longestWaitTimeMinutes: number | null;
  avgResolutionTimeMinutes: number | null;
  longestResolutionTimeMinutes: number | null;
}

interface TeamListProps {
  teams: Team[];
  queueStatsByTeamId?: Record<string, TeamQueueStats>;
  onTeamUpdated: () => void;
  /** When false, user can only view (no Add Member, Manage, Set default). */
  canManage?: boolean;
}

function formatWaitTime(minutes: number | null): string {
  if (minutes == null) return "—";
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return m ? `${h}h ${m}m` : `${h}h`;
}

export function TeamList({
  teams,
  queueStatsByTeamId = {},
  onTeamUpdated,
  canManage = true,
}: TeamListProps) {
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [isManageOpen, setIsManageOpen] = useState(false);
  const queryClient = useQueryClient();

  const setDefaultMutation = useMutation({
    mutationFn: (teamId: string) => agentApi.setDefaultTeam(teamId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agent-teams"] });
      onTeamUpdated();
      toast.success("Default team updated");
    },
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : "Failed to set default team",
      );
    },
  });

  const handleAddMember = (team: Team) => {
    setSelectedTeam(team);
    setIsAddMemberOpen(true);
  };

  const handleManageTeam = (team: Team) => {
    setSelectedTeam(team);
    setIsManageOpen(true);
  };

  return (
    <>
      {teams.map((team) => (
        <Card key={team.id} className="group hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <div className="flex items-center gap-2">
              <CardTitle className="text-xl font-bold">{team.name}</CardTitle>
              {team.isDefault && (
                <Badge variant="secondary" className="text-xs">
                  <Star className="h-3 w-3 mr-0.5 fill-current" />
                  Default
                </Badge>
              )}
            </div>
            {canManage && (
              <div className="flex items-center gap-1">
                {!team.isDefault && (team.memberCount ?? 0) > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDefaultMutation.mutate(team.id)}
                    disabled={setDefaultMutation.isPending}
                  >
                    Set default
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleManageTeam(team)}
                >
                  Manage
                </Button>
              </div>
            )}
          </CardHeader>
          <CardContent>
            {team.description && (
              <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                {team.description}
              </p>
            )}

            {(() => {
              const stats = queueStatsByTeamId[team.id];
              return stats ? (
                <div className="space-y-2 mb-4 text-xs">
                  <div className="grid grid-cols-3 gap-2 text-muted-foreground">
                    <div
                      className="flex items-center gap-1.5"
                      title="Active chats (assigned and accepted)"
                    >
                      <MessageSquare className="h-3.5 w-3 shrink-0" />
                      <span>Active: {stats.activeChats}</span>
                    </div>
                    <div
                      className="flex items-center gap-1.5"
                      title="Queued (unassigned)"
                    >
                      <Inbox className="h-3.5 w-3 shrink-0" />
                      <span>Queue: {stats.queueSize}</span>
                    </div>
                    <div
                      className="flex items-center gap-1.5"
                      title="Assign → accept"
                    >
                      <Clock className="h-3.5 w-3 shrink-0" />
                      <span>
                        Avg wait: {formatWaitTime(stats.avgWaitTimeMinutes)}
                      </span>
                    </div>
                    <div
                      className="flex items-center gap-1.5"
                      title="Longest assign → accept"
                    >
                      <Clock className="h-3.5 w-3 shrink-0" />
                      <span>
                        Longest: {formatWaitTime(stats.longestWaitTimeMinutes)}
                      </span>
                    </div>
                  </div>
                  <div
                    className="grid grid-cols-2 gap-2 text-muted-foreground"
                    title="Accept → resolved"
                  >
                    <div className="flex items-center gap-1.5">
                      <CheckCircle className="h-3.5 w-3 shrink-0" />
                      <span>
                        Avg resolve:{" "}
                        {formatWaitTime(stats.avgResolutionTimeMinutes)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <CheckCircle className="h-3.5 w-3 shrink-0" />
                      <span>
                        Longest resolve:{" "}
                        {formatWaitTime(stats.longestResolutionTimeMinutes)}
                      </span>
                    </div>
                  </div>
                </div>
              ) : null;
            })()}

            <div className="flex items-center justify-between mt-auto">
              <div className="flex items-center text-sm text-muted-foreground">
                <Users className="mr-1 h-4 w-4" />
                {team.memberCount || 0} Members
              </div>
              {canManage && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => handleAddMember(team)}
                >
                  <Plus className="mr-1 h-3 w-3" /> Add Member
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ))}

      {selectedTeam && (
        <>
          <AddMemberDialog
            open={isAddMemberOpen}
            onOpenChange={setIsAddMemberOpen}
            teamId={selectedTeam.id}
            teamName={selectedTeam.name}
            onSuccess={onTeamUpdated}
          />
          <ManageTeamDialog
            open={isManageOpen}
            onOpenChange={setIsManageOpen}
            teamId={selectedTeam.id}
            teamName={selectedTeam.name}
            onSuccess={onTeamUpdated}
          />
        </>
      )}
    </>
  );
}
