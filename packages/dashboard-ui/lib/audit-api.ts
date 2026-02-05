/**
 * Audit logs API – list tenant-scoped audit entries.
 */

import { fetchWithAuthFull } from "./api";

export interface AuditLogEntry {
  id: string;
  tenantId: string;
  actorId: string | null;
  actorType: string;
  action: string;
  resourceType: string | null;
  resourceId: string | null;
  details: Record<string, unknown> | null;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
}

export interface AuditLogsResponse {
  data: AuditLogEntry[];
  total: number;
  page: number;
  limit: number;
}

export interface AuditLogsParams {
  startDate?: string;
  endDate?: string;
  action?: string;
  actorId?: string;
  resourceType?: string;
  resourceId?: string;
  page?: number;
  limit?: number;
}

export async function getAuditLogs(
  params: AuditLogsParams = {},
): Promise<AuditLogsResponse> {
  const search = new URLSearchParams();
  if (params.startDate) search.set("startDate", params.startDate);
  if (params.endDate) search.set("endDate", params.endDate);
  if (params.action) search.set("action", params.action);
  if (params.actorId) search.set("actorId", params.actorId);
  if (params.resourceType) search.set("resourceType", params.resourceType);
  if (params.resourceId) search.set("resourceId", params.resourceId);
  if (params.page != null) search.set("page", String(params.page));
  if (params.limit != null) search.set("limit", String(params.limit));

  const url = `/audit-logs${search.toString() ? `?${search}` : ""}`;
  const res = await fetchWithAuthFull<{ data: AuditLogsResponse }>(url);
  return res.data;
}
