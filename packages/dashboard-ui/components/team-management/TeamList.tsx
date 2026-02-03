import { Team, agentApi } from "@/lib/api/agent";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Plus, Star } from "lucide-react";
import { useState } from "react";
import { AddMemberDialog } from "./AddMemberDialog";
import { ManageTeamDialog } from "./ManageTeamDialog";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface TeamListProps {
  teams: Team[];
  onTeamUpdated: () => void;
}

export function TeamList({ teams, onTeamUpdated }: TeamListProps) {
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
          </CardHeader>
          <CardContent>
            {team.description && (
              <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                {team.description}
              </p>
            )}

            <div className="flex items-center justify-between mt-auto">
              <div className="flex items-center text-sm text-muted-foreground">
                <Users className="mr-1 h-4 w-4" />
                {team.memberCount || 0} Members
              </div>

              <Button
                size="sm"
                variant="secondary"
                onClick={() => handleAddMember(team)}
              >
                <Plus className="mr-1 h-3 w-3" /> Add Member
              </Button>
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
