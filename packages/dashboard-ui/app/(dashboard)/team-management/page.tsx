"use client";

import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Users, Inbox } from "lucide-react";
import { toast } from "sonner";
import { agentApi, Team } from "@/lib/api/agent";
import { CreateTeamDialog } from "@/components/team-management/CreateTeamDialog";
import {
  TeamList,
  type TeamQueueStats,
} from "@/components/team-management/TeamList";
import { RouteGuard } from "@/components/auth/RouteGuard";
import { usePermission } from "@/components/auth/PermissionContext";

export default function TeamManagementPage() {
  const { can } = usePermission();
  const canManage = can("teams.manage");

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

  const { data: queueStats = [] } = useQuery({
    queryKey: ["agent-teams-queue-stats"],
    queryFn: () => agentApi.getQueueStats(),
  });
  const queueStatsByTeamId: Record<string, TeamQueueStats> = Object.fromEntries(
    queueStats.map((s) => [
      s.teamId,
      {
        queueSize: s.queueSize,
        activeChats: s.activeChats ?? 0,
        agentCount: s.agentCount ?? 0,
        avgWaitTimeMinutes: s.avgWaitTimeMinutes,
        longestWaitTimeMinutes: s.longestWaitTimeMinutes,
        avgResolutionTimeMinutes: s.avgResolutionTimeMinutes ?? null,
        longestResolutionTimeMinutes: s.longestResolutionTimeMinutes ?? null,
      },
    ]),
  );

  const queryClient = useQueryClient();
  const [assignQueueLoading, setAssignQueueLoading] = useState(false);

  return (
    <RouteGuard
      permissions={["teams.manage", "teams.view_all", "teams.view_team"]}
    >
      <div className="p-8 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">
              Team Management
            </h2>
            <p className="text-muted-foreground">
              {canManage
                ? "Manage support teams and agent assignments."
                : "View active chats, queued chats, and agent workload for your teams."}
            </p>
          </div>
          {canManage && (
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Create Team
            </Button>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {loading ? (
            <div>Loading teams...</div>
          ) : teams.length === 0 ? (
            <Card className="col-span-full p-8 text-center text-muted-foreground border-dashed">
              <Users className="mx-auto h-8 w-8 mb-2 opacity-50" />
              No teams found.{" "}
              {canManage && "Create your first team to get started."}
            </Card>
          ) : (
            <TeamList
              teams={teams}
              queueStatsByTeamId={queueStatsByTeamId}
              onTeamUpdated={fetchTeams}
              canManage={canManage}
            />
          )}
        </div>

        {canManage && (
          /* Scheduling & queue */
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-foreground">
              Scheduling & Queue
            </h3>
            <p className="text-sm text-muted-foreground -mt-4">
              Assign unassigned chats in the queue to available (online) agents.
              Queue assignment also runs automatically when an agent goes
              online.
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
        )}

        <CreateTeamDialog
          open={isCreateOpen}
          onOpenChange={setIsCreateOpen}
          onSuccess={fetchTeams}
        />
      </div>
    </RouteGuard>
  );
}
