export interface EosEvent {
  id: string;
  organizationId: string;
  name: string;
  slug?: string;
  description?: string;
  startsAt: string;
  endsAt: string;
  timezone: string;
  venueName?: string;
  venueAddress?: string;
  isVirtual: boolean;
  virtualUrl?: string;
  coverImageUrl?: string;
  settings?: {
    hype_card_on_reg?: boolean;
    venue_map_config?: {
      grid: { cols: number; rows: number };
      slots: Array<{ id: string; x: number; y: number }>;
    };
  };
  status: "draft" | "published" | "cancelled" | "completed";
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EosTicketType {
  id: string;
  eventId: string;
  name: string;
  description?: string;
  price: number;
  currency: string;
  quantityTotal?: number;
  quantitySold: number;
  isActive: boolean;
}

export interface EosExhibitor {
  id: string;
  eventId: string;
  name: string;
  description?: string;
  logoUrl?: string;
  boothNumber?: string;
  boothLocation?: { x: number; y: number; width: number; height: number };
  status: "pending" | "approved" | "rejected";
}

export interface EosTicket {
  id: string;
  ticketTypeId: string;
  ticketCode: string;
  qrCodeUrl?: string;
  holderName?: string;
  holderEmail?: string;
  paymentStatus: "pending" | "completed" | "failed";
  status: "valid" | "used" | "cancelled";
}

export interface EosLead {
  id: string;
  exhibitorId: string;
  contactId: string;
  source: string;
  interestLevel?: "cold" | "warm" | "hot";
  aiIntent?: string;
  createdAt: string;
}
