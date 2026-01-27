"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Users } from "lucide-react";
import { agentApi, Team } from "@/lib/api/agent";
import { CreateTeamDialog } from "@/components/team-management/CreateTeamDialog";
import { TeamList } from "@/components/team-management/TeamList";
import { RouteGuard } from "@/components/auth/RouteGuard";

export default function TeamManagementPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

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

  return (
    <RouteGuard permission="teams.manage">
      <div className="p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Team Management</h2>
            <p className="text-muted-foreground">Manage support teams and agent assignments.</p>
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
                  <TeamList teams={teams} onTeamUpdated={fetchTeams} />
            )}
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
