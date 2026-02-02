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
    const res = await fetchWithAuthFull<ContactsListResponse>(url);
    if (!res || typeof res !== "object" || !Array.isArray(res.data)) {
      throw new Error("Invalid contacts response");
    }
    return {
      data: res.data,
      total: typeof res.total === "number" ? res.total : res.data.length,
      page: res.page ?? page,
      limit: res.limit ?? limit,
    };
  },
};
