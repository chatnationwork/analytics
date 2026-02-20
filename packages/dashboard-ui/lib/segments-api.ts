import { fetchWithAuth } from "./api";
import type { AudienceFilter } from "./broadcast-types";

export interface ContactSegment {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  filter: AudienceFilter;
  contactCount: number;
  lastCountedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSegmentDto {
  name: string;
  description?: string;
  filter: AudienceFilter;
}

export interface UpdateSegmentDto {
  name?: string;
  description?: string;
  filter?: AudienceFilter;
}

export interface AudiencePreview {
  total: number;
  inWindow: number;
  outOfWindow: number;
  quotaStatus?: {
    businessSent24h: number;
    tierLimit: number | null;
    remaining: number | null;
    tier: string;
  };
}

export const segmentsApi = {
  list: (): Promise<ContactSegment[]> =>
    fetchWithAuth<ContactSegment[]>("/campaigns/segments"),

  create: (dto: CreateSegmentDto): Promise<ContactSegment> =>
    fetchWithAuth<ContactSegment>("/campaigns/segments", {
      method: "POST",
      body: JSON.stringify(dto),
    }),

  get: (id: string): Promise<ContactSegment> =>
    fetchWithAuth<ContactSegment>(`/campaigns/segments/${id}`),

  update: (id: string, dto: UpdateSegmentDto): Promise<ContactSegment> =>
    fetchWithAuth<ContactSegment>(`/campaigns/segments/${id}`, {
      method: "PATCH",
      body: JSON.stringify(dto),
    }),

  delete: (id: string): Promise<void> =>
    fetchWithAuth(`/campaigns/segments/${id}`, {
      method: "DELETE",
    }),

  preview: (filter: AudienceFilter | null): Promise<AudiencePreview> =>
    fetchWithAuth<AudiencePreview>("/campaigns/segments/preview", {
      method: "POST",
      body: JSON.stringify({ filter: filter ?? null }),
    }),
};
