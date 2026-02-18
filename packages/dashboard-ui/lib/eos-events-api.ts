import { fetchWithAuth } from "./api";
import {
  EosEvent,
  EosTicketType,
  EosExhibitor,
  EosLead,
} from "../types/eos-events";

export const eventsApi = {
  create: async (data: Partial<EosEvent>) => {
    return fetchWithAuth<EosEvent>("/eos/events", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  list: async () => {
    return fetchWithAuth<EosEvent[]>("/eos/events");
  },

  get: async (id: string) => {
    return fetchWithAuth<EosEvent>(`/eos/events/${id}`);
  },

  update: async (id: string, data: Partial<EosEvent>) => {
    return fetchWithAuth<EosEvent>(`/eos/events/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  publish: async (id: string) => {
    return fetchWithAuth<EosEvent>(`/eos/events/${id}/publish`, {
      method: "POST",
    });
  },

  getVenueLayout: async (id: string) => {
    return fetchWithAuth<{
      grid: { cols: number; rows: number };
      slots: any[];
      exhibitors: any[];
    }>(`/eos/events/${id}/venue-layout`);
  },

  // Ticket Types
  createTicketType: async (eventId: string, data: Partial<EosTicketType>) => {
    return fetchWithAuth<EosTicketType>(`/eos/events/${eventId}/ticket-types`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  // Exhibitors
  createExhibitor: async (eventId: string, data: Partial<EosExhibitor>) => {
    return fetchWithAuth<EosExhibitor>(`/eos/events/${eventId}/exhibitors`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  listExhibitors: async (eventId: string) => {
    return fetchWithAuth<EosExhibitor[]>(`/eos/events/${eventId}/exhibitors`);
  },

  // Leads
  listLeads: async (exhibitorId: string) => {
    return fetchWithAuth<EosLead[]>(`/eos/exhibitors/${exhibitorId}/leads`);
  },
};
