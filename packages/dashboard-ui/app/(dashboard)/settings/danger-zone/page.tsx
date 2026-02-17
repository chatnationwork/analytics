"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { RouteGuard } from "@/components/auth/RouteGuard";
import { usePermission } from "@/components/auth/PermissionContext";
import { useAuth } from "@/components/auth/AuthProvider";
import { api } from "@/lib/api";
import { agentApi, roleApi } from "@/lib/api/agent";
import { dangerZoneApi } from "@/lib/api/danger-zone";
import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";

const CONFIRM_TEXT = "DELETE";

export default function SettingsDangerZonePage() {
  const queryClient = useQueryClient();
  const { can } = usePermission();
  const { user: currentUser } = useAuth();
  const canAccessPage = can("admin.danger_zone");
  const canDeleteUser = can("users.delete");
  const canDeleteTeam = can("teams.delete");
  const canDeleteRole = can("roles.delete");

  const { data: tenant } = useQuery({
    queryKey: ["tenant"],
    queryFn: () => api.getCurrentTenant(),
  });
  const tenantId = tenant?.tenantId ?? "";

  const { data: members } = useQuery({
    queryKey: ["tenant-members"],
    queryFn: () => api.getTenantMembers(),
  });

  const { data: teams } = useQuery({
    queryKey: ["teams"],
    queryFn: () => agentApi.getTeams(),
  });

  const { data: roles } = useQuery({
    queryKey: ["roles", tenantId],
    queryFn: () => roleApi.getRoles(tenantId),
    enabled: !!tenantId,
  });

  const customRoles = roles?.filter((r) => !r.isSystem && r.tenantId === tenantId) ?? [];
  const deletableTeams = teams?.filter((t) => !t.isDefault) ?? [];
  const superAdminCount =
    members?.filter((m) => m.role === "super_admin" && m.isActive).length ?? 0;
  const deletableMembers =
    members?.filter(
      (m) =>
        m.isActive &&
        m.userId !== currentUser?.id &&
        !(m.role === "super_admin" && superAdminCount <= 1),
    ) ?? [];

  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [selectedRoleId, setSelectedRoleId] = useState<string>("");
  const [selectedTeamId, setSelectedTeamId] = useState<string>("");
  const [confirmUser, setConfirmUser] = useState("");
  const [confirmRole, setConfirmRole] = useState("");
  const [confirmTeam, setConfirmTeam] = useState("");

  const deleteUserMutation = useMutation({
    mutationFn: (userId: string) => dangerZoneApi.archiveAndDeleteUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant-members"] });
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      setSelectedUserId("");
      setConfirmUser("");
      toast.success("User removed");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteRoleMutation = useMutation({
    mutationFn: (roleId: string) =>
      dangerZoneApi.archiveAndDeleteRole(roleId, tenantId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      setSelectedRoleId("");
      setConfirmRole("");
      toast.success("Role deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteTeamMutation = useMutation({
    mutationFn: (teamId: string) => dangerZoneApi.archiveAndDeleteTeam(teamId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      setSelectedTeamId("");
      setConfirmTeam("");
      toast.success("Team deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!canAccessPage) return null;

  return (
    <RouteGuard permission="admin.danger_zone">
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Danger Zone</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Permanently delete users, roles, or teams. Data is archived before
            deletion.
          </p>
        </div>

        <div className="border border-red-200 dark:border-red-900/50 rounded-xl p-6 bg-red-50/30 dark:bg-red-950/20">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
            <h2 className="font-medium text-red-700 dark:text-red-300">
              Destructive actions
            </h2>
          </div>

          <div className="space-y-6">
            {canDeleteUser && (
              <DangerSection
                title="Delete user"
                description="Remove a user from this organization. Data is archived; the user is removed from the tenant and all teams."
                options={deletableMembers.map((m) => ({
                  value: m.userId,
                  label: `${m.name ?? m.email} (${m.role})`,
                }))}
                selected={selectedUserId}
                onSelect={setSelectedUserId}
                confirmValue={confirmUser}
                onConfirmChange={setConfirmUser}
                confirmText={CONFIRM_TEXT}
                onDelete={() => deleteUserMutation.mutate(selectedUserId)}
                isDeleting={deleteUserMutation.isPending}
              />
            )}

            {canDeleteRole && (
              <DangerSection
                title="Delete role"
                description="Permanently delete a custom role. Data is archived. Members are reverted to the system role if one exists."
                options={customRoles.map((r) => ({
                  value: r.id,
                  label: r.name,
                }))}
                selected={selectedRoleId}
                onSelect={setSelectedRoleId}
                confirmValue={confirmRole}
                onConfirmChange={setConfirmRole}
                confirmText={CONFIRM_TEXT}
                onDelete={() => deleteRoleMutation.mutate(selectedRoleId)}
                isDeleting={deleteRoleMutation.isPending}
              />
            )}

            {canDeleteTeam && (
              <DangerSection
                title="Delete team"
                description="Permanently delete a team and remove all members. Data is archived. The default team cannot be deleted."
                options={deletableTeams.map((t) => ({
                  value: t.id,
                  label: t.name,
                }))}
                selected={selectedTeamId}
                onSelect={setSelectedTeamId}
                confirmValue={confirmTeam}
                onConfirmChange={setConfirmTeam}
                confirmText={CONFIRM_TEXT}
                onDelete={() => deleteTeamMutation.mutate(selectedTeamId)}
                isDeleting={deleteTeamMutation.isPending}
              />
            )}

            {!canDeleteUser && !canDeleteRole && !canDeleteTeam && (
              <p className="text-sm text-muted-foreground">
                You do not have permission to perform any delete actions.
              </p>
            )}
          </div>
        </div>
      </div>
    </RouteGuard>
  );
}

interface DangerSectionProps {
  title: string;
  description: string;
  options: { value: string; label: string }[];
  selected: string;
  onSelect: (v: string) => void;
  confirmValue: string;
  onConfirmChange: (v: string) => void;
  confirmText: string;
  onDelete: () => void;
  isDeleting: boolean;
}

function DangerSection({
  title,
  description,
  options,
  selected,
  onSelect,
  confirmValue,
  onConfirmChange,
  confirmText,
  onDelete,
  isDeleting,
}: DangerSectionProps) {
  const canDelete =
    selected && confirmValue === confirmText && options.length > 0;

  return (
    <div className="border-t border-red-200/50 dark:border-red-900/30 pt-4 first:border-t-0 first:pt-0">
      <h3 className="font-medium text-foreground mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground mb-3">{description}</p>
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs text-muted-foreground mb-1">
            Select
          </label>
          <select
            value={selected}
            onChange={(e) => onSelect(e.target.value)}
            className="bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground min-w-[180px]"
            aria-label={`Select ${title.toLowerCase()}`}
          >
            <option value="">— Select —</option>
            {options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        {selected && (
          <>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">
                Type {confirmText} to confirm
              </label>
              <input
                type="text"
                value={confirmValue}
                onChange={(e) => onConfirmChange(e.target.value)}
                placeholder={confirmText}
                className="bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground min-w-[120px]"
              />
            </div>
            <button
              onClick={onDelete}
              disabled={!canDelete || isDeleting}
              className="border border-red-500 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 px-4 py-2 rounded-lg font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isDeleting ? "Deleting…" : "Delete"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
