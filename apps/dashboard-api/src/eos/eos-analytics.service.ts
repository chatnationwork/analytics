import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import {
  CampaignEntity,
  EosTicket,
  EosEvent,
  EosLead,
  CampaignStatus,
} from "@lib/database";

@Injectable()
export class EosAnalyticsService {
  private readonly logger = new Logger(EosAnalyticsService.name);

  constructor(
    @InjectRepository(CampaignEntity)
    private readonly campaignRepo: Repository<CampaignEntity>,
    @InjectRepository(EosTicket)
    private readonly ticketRepo: Repository<EosTicket>,
    @InjectRepository(EosEvent)
    private readonly eventRepo: Repository<EosEvent>,
    @InjectRepository(EosLead)
    private readonly leadRepo: Repository<EosLead>,
  ) {}

  /**
   * Aggregates conversion data for an event.
   * Logic: Invites Sent (Campaigns) vs. Tickets Issued vs. Leads Captured
   */
  async getEventConversionStats(organizationId: string, eventId: string) {
    // 1. Get all invitation campaigns for this event
    const campaigns = await this.campaignRepo.find({
      where: {
        tenantId: organizationId,
        sourceModule: "eos",
        sourceReferenceId: eventId,
      },
    });

    const totalInvitesSent = campaigns.reduce(
      (sum, c) => sum + (c.recipientCount || 0),
      0,
    );

    // 2. Get total tickets issued for this event
    const totalTickets = await this.ticketRepo.count({
      where: {
        ticketType: { eventId: eventId },
        paymentStatus: "completed",
      },
    });

    // 3. Get total leads captured (exhibitor interest)
    const leads = await this.leadRepo.find({
      where: {
        exhibitor: { eventId: eventId },
      },
    });

    const totalLeads = leads.length;
    const hotLeads = leads.filter((l) => l.interestLevel === "hot").length;

    // 4. Calculate conversion rates
    const invitationConversionRate =
      totalInvitesSent > 0 ? (totalTickets / totalInvitesSent) * 100 : 0;

    return {
      eventId,
      summary: {
        totalInvitesSent,
        totalTickets,
        totalLeads,
        hotLeads,
        invitationConversionRate: parseFloat(
          invitationConversionRate.toFixed(2),
        ),
      },
      campaigns: campaigns.map((c) => ({
        id: c.id,
        name: c.name,
        sent: c.recipientCount,
        status: c.status,
      })),
    };
  }

  /**
   * Generates a text-based summary for the AI Brain to consume.
   */
  async getAiSummaryData(eventId: string) {
    const event = await this.eventRepo.findOne({ where: { id: eventId } });
    if (!event) return null;

    const stats = await this.getEventConversionStats(
      event.organizationId,
      eventId,
    );

    return `
      Event: ${event.name}
      Status: ${event.status}
      Total Invites Sent: ${stats.summary.totalInvitesSent}
      Total Tickets Issued: ${stats.summary.totalTickets}
      Total Leads Captured: ${stats.summary.totalLeads}
      Hot Leads: ${stats.summary.hotLeads}
      Invite-to-Ticket Conversion: ${stats.summary.invitationConversionRate}%
    `.trim();
  }
}
