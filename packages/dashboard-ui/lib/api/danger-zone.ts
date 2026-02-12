import { fetchWithAuth } from "../api";

export const dangerZoneApi = {
  archiveAndDeleteRole: async (roleId: string, tenantId: string) => {
    return fetchWithAuth<{ success: boolean }>(
      `/settings/danger-zone/archive-and-delete/role/${roleId}`,
      {
        method: "POST",
        headers: { "x-tenant-id": tenantId },
      },
    );
  },

  archiveAndDeleteTeam: async (teamId: string) => {
    return fetchWithAuth<{ success: boolean }>(
      `/settings/danger-zone/archive-and-delete/team/${teamId}`,
      { method: "POST" },
    );
  },

  archiveAndDeactivateUser: async (userId: string) => {
    return fetchWithAuth<{ success: boolean }>(
      `/settings/danger-zone/archive-and-delete/user/${userId}`,
      { method: "POST" },
    );
  },
};
