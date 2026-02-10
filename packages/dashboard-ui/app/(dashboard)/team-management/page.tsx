"use client";

import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Users, Inbox, ArrowRightLeft, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { agentApi, Team } from "@/lib/api/agent";
import { CreateTeamDialog } from "@/components/team-management/CreateTeamDialog";
import { AssignQueueDialog } from "@/components/team-management/AssignQueueDialog";
import { BulkTransferDialog } from "@/components/team-management/BulkTransferDialog";
import { MassReengagementDialog } from "@/components/team-management/MassReengagementDialog";
import {
  TeamList,
  type TeamQueueStats,
} from "@/components/team-management/TeamList";
import { RouteGuard } from "@/components/auth/RouteGuard";
import { usePermission } from "@/components/auth/PermissionContext";

export default function TeamManagementPage() {
  const { can } = usePermission();
  const canManage = can("teams.manage");
  const canBulkTransfer = can("session.bulk_transfer");

  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isAssignQueueOpen, setIsAssignQueueOpen] = useState(false);
  const [isBulkTransferOpen, setIsBulkTransferOpen] = useState(false);
  const [isMassReengageOpen, setIsMassReengageOpen] = useState(false);

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

  const handleAssignQueueSuccess = (assigned: number) => {
    void Promise.all([
      queryClient.invalidateQueries({ queryKey: ["agent-teams-queue-stats"] }),
      queryClient.invalidateQueries({ queryKey: ["agent-status-list"] }),
      queryClient.invalidateQueries({ queryKey: ["agent-status-sessions"] }),
    ]);
    if (assigned > 0) {
      toast.success(`${assigned} chat(s) assigned from queue`);
    } else {
      toast.info("No queued chats to assign or no agents/teams available");
    }
  };

  const handleBulkTransferSuccess = () => {
    void Promise.all([
      queryClient.invalidateQueries({ queryKey: ["agent-teams-queue-stats"] }),
      queryClient.invalidateQueries({ queryKey: ["agent-status-list"] }),
      queryClient.invalidateQueries({ queryKey: ["agent-status-sessions"] }),
      queryClient.invalidateQueries({ queryKey: ["agent-inbox-counts"] }),
      queryClient.invalidateQueries({ queryKey: ["agent-inbox-for-bulk-transfer"] }),
    ]);
  };

  const handleMassReengageSuccess = () => {
    void Promise.all([
      queryClient.invalidateQueries({ queryKey: ["agent-teams-queue-stats"] }),
      queryClient.invalidateQueries({ queryKey: ["agent-inbox-counts"] }),
    ]);
  };

  return (
    <RouteGuard
      permissions={["teams.manage", "teams.view_all", "teams.view_team"]}
    >
      <div className="p-8 space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            Team Management
          </h2>
          <p className="text-muted-foreground mt-1">
            {canManage
              ? "Manage support teams and agent assignments."
              : "View active chats, queued chats, and agent workload for your teams."}
          </p>
        </div>

        {canManage && (
          <div className="flex items-center gap-2 flex-wrap border-b pb-4">
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" /> Create Team
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAssignQueueOpen(true)}
            >
              <Inbox className="h-4 w-4 mr-1.5" />
              Assign queue
            </Button>
            {canBulkTransfer && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsBulkTransferOpen(true)}
                >
                  <ArrowRightLeft className="h-4 w-4 mr-1.5" />
                  Bulk transfer
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsMassReengageOpen(true)}
                >
                  <MessageCircle className="h-4 w-4 mr-1.5" />
                  Mass re-engagement
                </Button>
              </>
            )}
          </div>
        )}

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

        <CreateTeamDialog
          open={isCreateOpen}
          onOpenChange={setIsCreateOpen}
          onSuccess={fetchTeams}
        />
        <AssignQueueDialog
          open={isAssignQueueOpen}
          onOpenChange={setIsAssignQueueOpen}
          onSuccess={handleAssignQueueSuccess}
        />
        {canBulkTransfer && (
          <>
            <BulkTransferDialog
              open={isBulkTransferOpen}
              onOpenChange={setIsBulkTransferOpen}
              onSuccess={handleBulkTransferSuccess}
            />
            <MassReengagementDialog
              open={isMassReengageOpen}
              onOpenChange={setIsMassReengageOpen}
              onSuccess={handleMassReengageSuccess}
            />
          </>
        )}
      </div>
    </RouteGuard>
  );
}
