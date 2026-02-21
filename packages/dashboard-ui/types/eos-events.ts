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
  metadata?: Record<string, any>;
}

export interface EosExhibitor {
  id: string;
  eventId: string;
  name: string;
  description?: string;
  logoUrl?: string;
  brochureUrl?: string;
  productImages?: string[];
  demoVideoUrl?: string;
  boothNumber?: string;
  boothLocation?: { x: number; y: number; width: number; height: number };
  status: "pending" | "approved" | "rejected";
  invitationToken?: string;
  boothToken?: string;
}

export interface EosSpeaker {
  id: string;
  eventId: string;
  name: string;
  bio?: string;
  headshotUrl?: string;
  talkTitle?: string;
  sessionTime?: string;
  presentationUrl?: string;
  contactPhone?: string;
  contactEmail?: string;
  status: "pending" | "approved" | "rejected";
  invitationToken?: string;
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

export interface EosLocation {
  id: string;
  eventId: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EosScanLog {
  id: string;
  ticketId: string;
  locationId?: string;
  status: string;
  timestamp: string;
  ticket?: EosTicket;
  location?: EosLocation;
}

export interface EosEventMetrics {
  totalTickets: number;
  totalRevenue: number;
  totalExhibitors: number;
  checkIns: number;
}
