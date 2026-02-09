/**
 * Contacts API – uses the same CRM source as WhatsApp (GET /api/dashboard/whatsapp/contacts).
 * Contacts are listed from the tenant's CRM integration (Chatnation).
 */

import { fetchWithAuthFull } from "./api";

export interface Contact {
  chat_id: string;
  whatsapp_number: string;
  email?: string;
  name?: string;
  status?: string;
  created_at: string;
}

export interface ContactsListResponse {
  data: Contact[];
  total: number;
  page: number;
  limit: number;
}

export const contactsApi = {
  getContacts: async (page = 1, limit = 20): Promise<ContactsListResponse> => {
    const url = `/whatsapp/contacts?page=${page}&limit=${limit}`;
    // Backend returns { data: Contact[], total, page, limit }; interceptor wraps as { status, data, timestamp }.
    const res = await fetchWithAuthFull<{ data: ContactsListResponse }>(url);

    if (!res?.data || !Array.isArray(res.data.data)) {
      throw new Error("Invalid contacts response");
    }

    const payload = res.data;
    return {
      data: payload.data,
      total: typeof payload.total === "number" ? payload.total : payload.data.length,
      page: payload.page ?? page,
      limit: payload.limit ?? limit,
    };
  },
};
