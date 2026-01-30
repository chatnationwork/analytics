
import { Team, agentApi } from "@/lib/api/agent";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, MoreVertical, Plus } from "lucide-react";
import { useState } from "react";
import { AddMemberDialog } from "./AddMemberDialog";

interface TeamListProps {
  teams: Team[];
  onTeamUpdated: () => void;
}

import { ManageTeamDialog } from "./ManageTeamDialog";

interface TeamListProps {
  teams: Team[];
  onTeamUpdated: () => void;
}

export function TeamList({ teams, onTeamUpdated }: TeamListProps) {
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [isManageOpen, setIsManageOpen] = useState(false);

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
            <CardTitle className="text-xl font-bold">{team.name}</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => handleManageTeam(team)}>
               Manage
            </Button>
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
              
              <Button size="sm" variant="secondary" onClick={() => handleAddMember(team)}>
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
