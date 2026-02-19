import { fetchWithAuth } from "./api";
import {
  EosEvent,
  EosTicketType,
  EosExhibitor,
  EosLead,
  EosTicket,
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
      body: JSON.stringify({}),
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
  listTicketTypes: async (eventId: string) => {
    return fetchWithAuth<EosTicketType[]>(
      `/eos/events/${eventId}/ticket-types`,
    );
  },
  updateTicketType: async (
    id: string,
    eventId: string,
    data: Partial<EosTicketType>,
  ) => {
    return fetchWithAuth<EosTicketType>(
      `/eos/events/${eventId}/ticket-types/${id}`,
      {
        method: "PATCH",
        body: JSON.stringify(data),
      },
    );
  },
  deleteTicketType: async (id: string, eventId: string) => {
    return fetchWithAuth<void>(`/eos/events/${eventId}/ticket-types/${id}`, {
      method: "DELETE",
    });
  },

  // Exhibitors
  createExhibitor: async (eventId: string, data: Partial<EosExhibitor>) => {
    return fetchWithAuth<EosExhibitor>(`/eos/events/${eventId}/exhibitors`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
  inviteExhibitor: async (eventId: string, data: Partial<EosExhibitor>) => {
    return fetchWithAuth<EosExhibitor>(
      `/eos/events/${eventId}/exhibitors/invite`,
      {
        method: "POST",
        body: JSON.stringify(data),
      },
    );
  },
  listExhibitors: async (eventId: string) => {
    return fetchWithAuth<EosExhibitor[]>(`/eos/events/${eventId}/exhibitors`);
  },
  updateExhibitor: async (
    id: string,
    eventId: string,
    data: Partial<EosExhibitor>,
  ) => {
    return fetchWithAuth<EosExhibitor>(
      `/eos/events/${eventId}/exhibitors/${id}`,
      {
        method: "PATCH",
        body: JSON.stringify(data),
      },
    );
  },
  approveExhibitor: async (id: string, eventId: string) => {
    return fetchWithAuth<EosExhibitor>(
      `/eos/events/${eventId}/exhibitors/${id}/approve`,
      {
        method: "PATCH",
        body: JSON.stringify({}),
      },
    );
  },
  rejectExhibitor: async (id: string, eventId: string) => {
    return fetchWithAuth<EosExhibitor>(
      `/eos/events/${eventId}/exhibitors/${id}/reject`,
      {
        method: "PATCH",
        body: JSON.stringify({}),
      },
    );
  },
  deleteExhibitor: async (id: string, eventId: string) => {
    return fetchWithAuth<void>(`/eos/events/${eventId}/exhibitors/${id}`, {
      method: "DELETE",
    });
  },

  // Tickets
  listTickets: async (eventId: string) => {
    return fetchWithAuth<EosTicket[]>(`/eos/events/${eventId}/tickets`);
  },
  checkIn: async (ticketCode: string) => {
    return fetchWithAuth<any>("/eos/tickets/check-in", {
      method: "POST",
      body: JSON.stringify({ ticketCode }),
    });
  },
  getTicketStatus: async (id: string) => {
    return fetchWithAuth<any>(`/eos/tickets/${id}/status`);
  },

  // Event Lifecycle
  cancel: async (id: string) => {
    return fetchWithAuth<EosEvent>(`/eos/events/${id}/cancel`, {
      method: "POST",
      body: JSON.stringify({}),
    });
  },
  complete: async (id: string) => {
    return fetchWithAuth<EosEvent>(`/eos/events/${id}/complete`, {
      method: "POST",
      body: JSON.stringify({}),
    });
  },

  // Leads
  listLeads: async (exhibitorId: string) => {
    return fetchWithAuth<EosLead[]>(`/eos/exhibitors/${exhibitorId}/leads`);
  },

  // Invitations & Campaigns
  sendInvites: async (
    id: string,
    data: {
      name: string;
      templateId: string;
      audienceFilter?: any;
      templateParams?: Record<string, string>;
    },
  ) => {
    return fetchWithAuth<any>(`/eos/events/${id}/invite`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
  getCampaignStats: async (id: string) => {
    return fetchWithAuth<any>(`/eos/events/${id}/campaign-stats`);
  },
};
