"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Mail,
  Copy,
  Search,
  Circle,
  Loader2,
  UserX,
  UserCheck,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { fetchWithAuth, api } from "@/lib/api";
import { useCan } from "@/components/auth/PermissionContext";
import { useAuth } from "@/components/auth/AuthProvider";
import { agentStatusApi } from "@/lib/agent-status-api";

interface Member {
  userId: string;
  name: string | null;
  email: string;
  role: string;
  joinedAt: string;
  isActive: boolean;
  invitedBy?: string;
  invitedByName?: string | null;
  avatarUrl?: string | null;
}

interface Invitation {
  id: string;
  email: string;
  role: string;
  status: string;
  token: string;
  createdAt: string;
}

const ROLES: { value: string; label: string }[] = [
  { value: "super_admin", label: "Super Admin (Full access)" },
  { value: "admin", label: "Admin (Manage workspace)" },
  { value: "auditor", label: "Auditor (View only)" },
  { value: "member", label: "Member (Standard access)" },
];

function formatRole(role: string): string {
  return role.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function TeamManagement({ tenantId }: { tenantId: string }) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const currentUserId = user?.id ?? "";
  const canManage = useCan("teams.manage");

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [onlineFilter, setOnlineFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: members = [], isLoading: membersLoading } = useQuery({
    queryKey: ["tenant-members"],
    queryFn: () => api.getTenantMembers(),
  });

  const { data: invitations = [] } = useQuery({
    queryKey: ["tenant-invitations", tenantId],
    queryFn: () =>
      fetchWithAuth<Invitation[]>(`/tenants/${tenantId}/invitations`),
    enabled: !!tenantId,
  });

  const { data: agentStatusList = [] } = useQuery({
    queryKey: ["agent-status-list"],
    queryFn: () => agentStatusApi.getAgentStatusList(),
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) =>
      api.updateMemberRole(userId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant-members"] });
      toast.success("Role updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deactivateMemberMutation = useMutation({
    mutationFn: (userId: string) => api.deactivateMember(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant-members"] });
      toast.success("Member deactivated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const reactivateMemberMutation = useMutation({
    mutationFn: (userId: string) => api.reactivateMember(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant-members"] });
      toast.success("Member reactivated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const statusByUserId = useMemo(() => {
    const map = new Map<string, string>();
    agentStatusList.forEach((a) => map.set(a.agentId, a.status));
    return map;
  }, [agentStatusList]);

  const membersWithStatus = useMemo(
    () =>
      members.map((m) => ({
        ...m,
        isActive: m.isActive !== false,
        isOnline: statusByUserId.get(m.userId) === "online",
      })),
    [members, statusByUserId],
  );

  const filteredMembers = useMemo(() => {
    let list = membersWithStatus;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (m) =>
          (m.name ?? "").toLowerCase().includes(q) ||
          m.email.toLowerCase().includes(q),
      );
    }
    if (roleFilter !== "all") {
      list = list.filter((m) => m.role === roleFilter);
    }
    if (statusFilter === "active") {
      list = list.filter((m) => m.isActive);
    }
    if (statusFilter === "deactivated") {
      list = list.filter((m) => !m.isActive);
    }
    if (onlineFilter === "online") {
      list = list.filter((m) => m.isOnline);
    }
    if (onlineFilter === "offline") {
      list = list.filter((m) => !m.isOnline);
    }
    return list;
  }, [membersWithStatus, search, roleFilter, statusFilter, onlineFilter]);

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    if (!tenantId) {
      toast.error("Workspace not loaded. Please refresh the page.");
      return;
    }
    try {
      await fetchWithAuth(`/tenants/${tenantId}/invitations`, {
        method: "POST",
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
      });
      toast.success("Invitation sent");
      setInviteEmail("");
      setIsInviteOpen(false);
      queryClient.invalidateQueries({ queryKey: ["tenant-members"] });
      queryClient.invalidateQueries({
        queryKey: ["tenant-invitations", tenantId],
      });
    } catch (e: unknown) {
      toast.error(
        e instanceof Error ? e.message : "Could not create invitation",
      );
    }
  };

  const copyInviteLink = (token: string) => {
    const link = `${typeof window !== "undefined" ? window.location.origin : ""}/invite/accept?token=${token}`;
    navigator.clipboard.writeText(link);
    toast.success("Invite link copied");
  };

  const revokeInvite = async (id: string) => {
    if (!confirm("Revoke this invitation?")) return;
    try {
      await fetchWithAuth(`/tenants/${tenantId}/invitations/${id}`, {
        method: "DELETE",
      });
      toast.success("Invitation revoked");
      queryClient.invalidateQueries({
        queryKey: ["tenant-invitations", tenantId],
      });
    } catch {
      toast.error("Failed to revoke");
    }
  };

  if (membersLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-medium text-foreground">Team Members</h2>
          <p className="text-sm text-muted-foreground">
            See who has access, who invited them, when they joined, and manage
            roles.
          </p>
        </div>
        {canManage && (
          <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" /> Invite Member
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Invite User</DialogTitle>
                <DialogDescription>
                  Send an invitation to join your workspace.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Email</label>
                  <Input
                    placeholder="colleague@company.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Role</label>
                  <Select value={inviteRole} onValueChange={setInviteRole}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLES.map((r) => (
                        <SelectItem key={r.value} value={r.value}>
                          {r.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleInvite}>Send Invitation</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All roles</SelectItem>
            {ROLES.map((r) => (
              <SelectItem key={r.value} value={r.value}>
                {formatRole(r.value)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Access" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="deactivated">Deactivated</SelectItem>
          </SelectContent>
        </Select>
        <Select value={onlineFilter} onValueChange={setOnlineFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Online" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="online">Online</SelectItem>
            <SelectItem value="offline">Offline</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Invited by</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Access</TableHead>
                <TableHead>Online</TableHead>
                {canManage && (
                  <TableHead className="text-right">Actions</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMembers.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={canManage ? 7 : 6}
                    className="text-center text-muted-foreground py-8"
                  >
                    {members.length === 0
                      ? "No members yet. Invite someone to get started."
                      : "No members match the current filters."}
                  </TableCell>
                </TableRow>
              ) : (
                filteredMembers.map((m) => (
                  <TableRow key={m.userId}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-medium text-foreground">
                          {m.name?.[0] ?? m.email[0].toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium text-foreground">
                            {m.name || "—"}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {m.email}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {canManage ? (
                        <Select
                          value={m.role}
                          onValueChange={(role) =>
                            updateRoleMutation.mutate({
                              userId: m.userId,
                              role,
                            })
                          }
                          disabled={
                            m.userId === currentUserId ||
                            updateRoleMutation.isPending
                          }
                        >
                          <SelectTrigger className="w-[130px] h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ROLES.map((r) => (
                              <SelectItem key={r.value} value={r.value}>
                                {r.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge variant="secondary" className="capitalize">
                          {formatRole(m.role)}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {m.invitedByName ?? "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(m.joinedAt).toLocaleDateString(undefined, {
                        dateStyle: "medium",
                      })}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center gap-1.5 text-xs ${
                          m.isActive
                            ? "text-green-600 dark:text-green-400"
                            : "text-muted-foreground"
                        }`}
                      >
                        {m.isActive ? (
                          <>
                            <UserCheck className="h-3.5 w-3.5" />
                            Active
                          </>
                        ) : (
                          <>
                            <UserX className="h-3.5 w-3.5" />
                            Deactivated
                          </>
                        )}
                      </span>
                    </TableCell>
                    <TableCell>
                      {statusByUserId.has(m.userId) ? (
                        <span
                          className={`inline-flex items-center gap-1.5 text-xs ${
                            m.isOnline
                              ? "text-green-600"
                              : "text-muted-foreground"
                          }`}
                        >
                          <Circle
                            className={`h-2 w-2 fill-current ${
                              m.isOnline
                                ? "text-green-600"
                                : "text-muted-foreground"
                            }`}
                          />
                          {m.isOnline ? "Online" : "Offline"}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    {canManage && (
                      <TableCell className="text-right">
                        {m.isActive ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-amber-600 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-300"
                            disabled={
                              m.userId === currentUserId ||
                              deactivateMemberMutation.isPending
                            }
                            onClick={() => {
                              if (
                                confirm(
                                  `Deactivate ${m.name || m.email}? They will lose access to this workspace until reactivated.`,
                                )
                              ) {
                                deactivateMemberMutation.mutate(m.userId);
                              }
                            }}
                          >
                            <UserX className="h-4 w-4 mr-1" />
                            Deactivate
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300"
                            disabled={reactivateMemberMutation.isPending}
                            onClick={() =>
                              reactivateMemberMutation.mutate(m.userId)
                            }
                          >
                            <UserCheck className="h-4 w-4 mr-1" />
                            Reactivate
                          </Button>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {invitations.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-foreground mb-3">
            Pending Invitations
          </h3>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Sent</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invitations.map((inv) => (
                    <TableRow key={inv.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{inv.email}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {formatRole(inv.role)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(inv.createdAt).toLocaleDateString(undefined, {
                          dateStyle: "medium",
                        })}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => copyInviteLink(inv.token)}
                          >
                            <Copy className="h-3 w-3 mr-1" /> Copy link
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => revokeInvite(inv.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
