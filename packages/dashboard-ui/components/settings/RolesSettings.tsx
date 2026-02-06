"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { roleApi, Role } from "@/lib/api/agent";
import { Trash2, Plus, Edit2, Shield, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";

const roleSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  permissions: z.array(z.string()),
});

type RoleFormData = z.infer<typeof roleSchema>;

interface RolesSettingsProps {
  tenantId?: string;
}

export function RolesSettings({ tenantId }: RolesSettingsProps) {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);

  // Fetch Roles
  const { data: roles, isLoading: isLoadingRoles } = useQuery({
    queryKey: ["roles", tenantId],
    queryFn: () => roleApi.getRoles(tenantId),
    enabled: !!tenantId,
  });

  // Fetch Available Permissions
  const { data: permissions } = useQuery({
    queryKey: ["permissions", tenantId],
    queryFn: () => roleApi.getPermissions(tenantId),
    enabled: !!tenantId,
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: RoleFormData) => roleApi.createRole(data, tenantId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      toast.success("Role created successfully");
      handleClose();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const updateMutation = useMutation({
    mutationFn: (data: { id: string; payload: RoleFormData }) =>
      roleApi.updateRole(data.id, data.payload, tenantId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      toast.success("Role updated successfully");
      handleClose();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => roleApi.deleteRole(id, tenantId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      toast.success("Role deleted successfully");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  // Form
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RoleFormData>({
    resolver: zodResolver(roleSchema),
    defaultValues: {
      name: "",
      description: "",
      permissions: [],
    },
  });

  const selectedPermissions = watch("permissions") ?? [];

  const togglePermission = (perm: string, checked: boolean) => {
    if (checked) {
      setValue("permissions", [...selectedPermissions, perm]);
    } else {
      setValue(
        "permissions",
        selectedPermissions.filter((p) => p !== perm),
      );
    }
  };

  const handleEdit = (role: Role) => {
    setEditingRole(role);
    reset({
      name: role.name,
      description: role.description || "",
      permissions: role.permissions,
    });
    setIsDialogOpen(true);
  };

  const handleClose = () => {
    setIsDialogOpen(false);
    setEditingRole(null);
    reset({
      name: "",
      description: "",
      permissions: [],
    });
  };

  const onSubmit = (data: RoleFormData) => {
    if (editingRole) {
      updateMutation.mutate({ id: editingRole.id, payload: data });
    } else {
      createMutation.mutate(data);
    }
  };

  /** Human-readable label for a permission string (e.g. session.bulk_transfer → Bulk transfer) */
  const permissionLabel = (perm: string) => {
    const part = perm.split(".").pop() ?? perm;
    const withSpaces = part.replace(/_/g, " ");
    return withSpaces.charAt(0).toUpperCase() + withSpaces.slice(1);
  };

  /** Group permissions by prefix for display (e.g. Analytics, Team, Session) */
  const permissionsByGroup = useMemo(() => {
    if (!permissions?.length) return [];
    const byPrefix = new Map<string, string[]>();
    for (const p of permissions) {
      const prefix = p.includes(".") ? p.split(".")[0] : "Other";
      const list = byPrefix.get(prefix) ?? [];
      list.push(p);
      byPrefix.set(prefix, list);
    }
    return Array.from(byPrefix.entries()).map(([prefix, perms]) => ({
      group: prefix.charAt(0).toUpperCase() + prefix.slice(1),
      perms,
    }));
  }, [permissions]);

  if (isLoadingRoles) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="animate-spin text-[var(--primary)]" size={24} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium leading-6 text-foreground">
            Roles & Permissions
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage custom roles and define specific access levels for your team
            members.
          </p>
        </div>
        <button
          onClick={() => setIsDialogOpen(true)}
          className="flex items-center gap-2 bg-[var(--primary)] text-white px-4 py-2 rounded-md hover:bg-[var(--primary-dark)] transition-colors text-sm font-medium"
        >
          <Plus size={16} /> Create Role
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Role Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Description
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Permissions
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Type
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-card divide-y divide-border">
            {roles?.map((role) => (
              <tr key={role.id}>
                <td className="px-6 py-4 whitespace-nowrap font-medium text-foreground">
                  {role.name}
                </td>
                <td
                  className="px-6 py-4 text-sm text-muted-foreground max-w-xs truncate"
                  title={role.description}
                >
                  {role.description || "-"}
                </td>
                <td className="px-6 py-4 text-sm text-muted-foreground">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                    {role.permissions?.length || 0} permissions
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {role.isSystem ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 result-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400 rounded-full">
                      <Shield size={12} /> System
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                      Custom
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => handleEdit(role)}
                      className="text-muted-foreground hover:text-foreground"
                      title="Edit"
                    >
                      <Edit2 size={16} />
                    </button>
                    {!role.isSystem && (
                      <button
                        onClick={() => {
                          if (
                            confirm(
                              `Are you sure you want to delete the role "${role.name}"?`,
                            )
                          ) {
                            deleteMutation.mutate(role.id);
                          }
                        }}
                        className="text-red-600 hover:text-red-900 dark:hover:text-red-400"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                    {role.isSystem && (
                      <button
                        className="text-muted-foreground cursor-not-allowed"
                        title="System roles cannot be deleted directly"
                        disabled
                      >
                        <Shield size={16} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingRole ? "Edit Role" : "Create Role"}
            </DialogTitle>
            <DialogDescription>
              define the role details and assign permissions.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Role Name</label>
              <input
                {...register("name")}
                className="w-full px-3 py-2 border border-input bg-background rounded-md"
                placeholder="e.g. Content Moderator"
                disabled={!!editingRole && editingRole.isSystem}
              />
              {editingRole?.isSystem && (
                <p className="text-xs text-blue-500 mt-1">
                  Editing a system role will create a custom override for your
                  organization.
                </p>
              )}
              {errors.name && (
                <p className="text-red-500 text-xs">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <textarea
                {...register("description")}
                className="w-full px-3 py-2 border border-input bg-background rounded-md min-h-[80px]"
                placeholder="Describe what this role is for..."
              />
            </div>

            <div className="space-y-4">
              <label className="text-sm font-medium block">Permissions</label>
              <p className="text-xs text-muted-foreground mb-2">
                Check each action this role should allow. Save when done.
              </p>
              <div className="border border-border rounded-md bg-muted/30 overflow-hidden">
                {!permissions?.length ? (
                  <p className="text-sm text-muted-foreground p-4">
                    Loading permissions…
                  </p>
                ) : (
                  <div className="divide-y divide-border">
                    {permissionsByGroup.map(({ group, perms }) => (
                      <div key={group} className="p-3">
                        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                          {group}
                        </div>
                        <div className="flex flex-wrap gap-x-6 gap-y-2">
                          {perms.map((perm) => (
                            <label
                              key={perm}
                              className="flex items-center gap-2 cursor-pointer text-sm text-foreground"
                            >
                              <Checkbox
                                checked={selectedPermissions.includes(perm)}
                                onCheckedChange={(checked) =>
                                  togglePermission(perm, checked === true)
                                }
                              />
                              {permissionLabel(perm)}
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <DialogFooter>
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 border border-border rounded-md hover:bg-muted text-sm text-foreground"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={
                  isSubmitting ||
                  createMutation.isPending ||
                  updateMutation.isPending
                }
                className="px-4 py-2 bg-[var(--primary)] text-white rounded-md text-sm hover:bg-[var(--primary-dark)]"
              >
                {isSubmitting ||
                createMutation.isPending ||
                updateMutation.isPending
                  ? "Saving..."
                  : "Save Role"}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
