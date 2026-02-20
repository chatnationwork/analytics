import {
  Injectable,
  BadRequestException,
  Logger,
  OnModuleInit,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import {
  EosEvent,
  IdentityEntity,
  EosTicket,
  ContactEntity,
  CampaignType,
  CampaignEntity,
  CampaignStatus,
  UserEntity,
} from "@lib/database";
import { EosExhibitor } from "@lib/database";
import { EosTicketType } from "@lib/database";
import { CreateEventDto } from "./dto/create-event.dto";
import { SendEventInviteDto } from "./dto/send-event-invite.dto";
import { TriggerService } from "../campaigns/trigger.service";
import { CampaignTrigger } from "../campaigns/constants";
import { CampaignsService } from "../campaigns/campaigns.service";
import { CampaignOrchestratorService } from "../campaigns/campaign-orchestrator.service";
import { SchedulerService } from "@lib/database";
import { EosAnalyticsService } from "./eos-analytics.service";

@Injectable()
export class EosEventService implements OnModuleInit {
  constructor(
    @InjectRepository(EosEvent)
    private readonly eventRepo: Repository<EosEvent>,
    @InjectRepository(EosExhibitor)
    private readonly exhibitorRepo: Repository<EosExhibitor>,
    @InjectRepository(EosTicketType)
    private readonly ticketTypeRepo: Repository<EosTicketType>,
    @InjectRepository(IdentityEntity)
    private readonly identityRepo: Repository<IdentityEntity>,
    @InjectRepository(EosTicket)
    private readonly ticketRepo: Repository<EosTicket>,
    @InjectRepository(CampaignEntity)
    private readonly campaignRepo: Repository<CampaignEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    private readonly triggerService: TriggerService,
    private readonly campaignsService: CampaignsService,
    private readonly campaignOrchestrator: CampaignOrchestratorService,
    private readonly schedulerService: SchedulerService,
    private readonly analyticsService: EosAnalyticsService,
    @InjectRepository(ContactEntity)
    private readonly contactRepo: Repository<ContactEntity>,
  ) {}

  onModuleInit() {
    this.schedulerService.registerHandler(
      "eos.event_reminder",
      async (tenantId, payload) => {
        const { eventId, userId, message } = payload as any;
        await this.bulkBroadcast(tenantId, eventId, userId, message);
      },
    );
    new Logger(EosEventService.name).log(
      "Registered 'eos.event_reminder' handler",
    );
  }

  async createEvent(
    user: { id: string; tenantId: string },
    dto: CreateEventDto,
  ): Promise<EosEvent> {
    if (new Date(dto.startsAt) >= new Date(dto.endsAt)) {
      throw new BadRequestException("Start date must be before end date");
    }

    // Find identity for audit
    const identity = await this.identityRepo.findOne({
      where: { userId: user.id, tenantId: user.tenantId },
    });

    const slug =
      dto.slug ??
      dto.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");

    const event = this.eventRepo.create({
      ...dto,
      slug,
      organizationId: user.tenantId,
      createdById: identity?.id,
      updatedById: identity?.id,
      settings: {
        ...dto.settings,
        venue_map_config: dto.settings?.venue_map_config || {
          grid: { cols: 10, rows: 10 },
          slots: [],
        },
      },
    });

    return this.eventRepo.save(event);
  }

  async findOne(organizationId: string, eventId: string): Promise<EosEvent> {
    return this.eventRepo.findOneOrFail({
      where: { id: eventId, organizationId },
      relations: ["ticketTypes", "exhibitors"],
    });
  }

  async findOnePublic(eventId: string): Promise<EosEvent> {
    return this.eventRepo.findOneOrFail({
      where: { id: eventId },
    });
  }

  async getVenueLayout(organizationId: string, eventId: string) {
    const event = await this.findOne(organizationId, eventId);
    const exhibitors = await this.exhibitorRepo.find({
      where: { eventId, status: "approved" },
      select: ["id", "name", "boothLocation", "boothNumber"],
    });

    return {
      grid: event.settings?.venue_map_config?.grid || { cols: 10, rows: 10 },
      slots: event.settings?.venue_map_config?.slots || [],
      exhibitors: exhibitors.map((e) => ({
        id: e.id,
        name: e.name,
        boothNumber: e.boothNumber,
        location: e.boothLocation,
      })),
    };
  }

  async updateVenueLayout(
    organizationId: string,
    eventId: string,
    layout: {
      grid: { cols: number; rows: number };
      slots: any[];
    },
  ): Promise<EosEvent> {
    const event = await this.findOne(organizationId, eventId);

    // Basic validation: ensure slot IDs and names are unique within the layout
    const slotIds = new Set();
    const slotNames = new Set();
    for (const slot of layout.slots) {
      if (slotIds.has(slot.id)) {
        throw new BadRequestException(`Duplicate slot ID: ${slot.id}`);
      }
      if (slot.name && slotNames.has(slot.name)) {
        throw new BadRequestException(`Duplicate slot name: ${slot.name}`);
      }
      slotIds.add(slot.id);
      if (slot.name) {
        slotNames.add(slot.name);
      }
    }

    event.settings = {
      ...(event.settings || {}),
      venue_map_config: layout,
    };

    return this.eventRepo.save(event);
  }

  async publishEvent(
    organizationId: string,
    eventId: string,
  ): Promise<EosEvent> {
    const event = await this.findOne(organizationId, eventId);

    event.status = "published";
    event.publishedAt = new Date();
    const saved = await this.eventRepo.save(event);

    // Fire Trigger
    await this.triggerService.fire(CampaignTrigger.EVENT_PUBLISHED, {
      tenantId: organizationId,
      contactId: "SYSTEM", // Event-wide triggers often don't have a single contact,
      // but the trigger service needs one to resolve.
      // Actually, EVENT_PUBLISHED might be intended for all contacts?
      // The current triggerService.fire requires a contactId.
      // If the user wants to notify everyone, they should use a manual campaign.
      // However, we can use this to notify the event owner or a specific group.
      context: {
        eventId: event.id,
        eventName: event.name,
        startsAt: event.startsAt.toISOString(),
      },
    });

    return saved;
  }

  async update(
    user: { id: string; tenantId: string },
    eventId: string,
    updates: Partial<EosEvent>,
  ): Promise<EosEvent> {
    const event = await this.findOne(user.tenantId, eventId);

    // Find identity for audit
    const identity = await this.identityRepo.findOne({
      where: { userId: user.id, tenantId: user.tenantId },
    });

    Object.assign(event, updates);
    event.updatedById = identity?.id || event.updatedById;

    return this.eventRepo.save(event);
  }

  async findAll(organizationId: string): Promise<EosEvent[]> {
    return this.eventRepo.find({
      where: { organizationId },
      order: { createdAt: "DESC" },
    });
  }

  async cancelEvent(organizationId: string, id: string): Promise<EosEvent> {
    const event = await this.findOne(organizationId, id);
    event.status = "cancelled";
    return this.eventRepo.save(event);
  }

  async endEvent(organizationId: string, id: string): Promise<EosEvent> {
    const event = await this.findOne(organizationId, id);

    // Move to grace period
    event.status = "grace_period";
    event.gracePeriodEndsAt = new Date(
      Date.now() + event.gracePeriodHours * 60 * 60 * 1000,
    );

    return this.eventRepo.save(event);
  }

  async finalizeEvent(id: string): Promise<void> {
    const event = await this.eventRepo.findOne({
      where: { id },
    });
    if (!event) return;

    // 1. Mark as completed
    event.status = "completed";
    await this.eventRepo.save(event);

    // 2. Identify attendees (used tickets)
    const tickets = await this.ticketRepo.find({
      where: {
        ticketType: { eventId: id },
        status: "used",
      },
      relations: ["contact"],
    });

    // 3. Fire EVENT_COMPLETED for each attendee
    for (const ticket of tickets) {
      if (ticket.contact?.contactId) {
        await this.triggerService
          .fire(CampaignTrigger.EVENT_COMPLETED, {
            tenantId: event.organizationId,
            contactId: ticket.contact.contactId,
            context: {
              eventName: event.name,
              attendeeName: ticket.holderName || ticket.contact.name,
            },
          })
          .catch((err) =>
            new Logger(EosEventService.name).error(
              `Failed to fire EVENT_COMPLETED for ticket ${ticket.id}: ${err.message}`,
            ),
          );
      }
    }

    // 4. (Future) Trigger AI reports
    const aiSummary = await this.analyticsService.getAiSummaryData(id);

    // 5. Notify Organizer with AI Summary
    if (event.createdById) {
      const identity = await this.identityRepo.findOne({
        where: { id: event.createdById },
      });
      if (identity?.userId) {
        const organizer = await this.userRepo.findOne({
          where: { id: identity.userId },
        });
        if (organizer?.phone) {
          await this.triggerService
            .fire(CampaignTrigger.EVENT_COMPLETED, {
              tenantId: event.organizationId,
              contactId: organizer.phone,
              context: {
                eventName: event.name,
                isOrganizer: true,
                aiSummary: aiSummary,
              },
            })
            .catch((err) =>
              new Logger(EosEventService.name).error(
                `Failed to notify organizer ${organizer.id}: ${err.message}`,
              ),
            );
        }
      }
    }

    new Logger(EosEventService.name).log(
      `Event ${event.name} finalized. ${tickets.length} attendees processed. AI Summary triggered for organizer.`,
    );
  }

  /**
   * Bulk Broadcast: Creates and launches a manual campaign targeting all contacts
   * who have tickets for this event or are exhibitors.
   */
  async bulkBroadcast(
    organizationId: string,
    eventId: string,
    userId: string,
    messageBody: string,
  ) {
    const event = await this.findOne(organizationId, eventId);

    // 1. Create a Manual Campaign
    const campaign = await this.campaignsService.create(
      organizationId,
      userId,
      {
        name: `Broadcast: ${event.name} - ${new Date().toLocaleDateString()}`,
        type: CampaignType.MANUAL,
        messageTemplate: { text: { body: messageBody } },
        audienceFilter: {
          logic: "OR",
          conditions: [
            { field: "metadata.eventName", operator: "eq", value: event.name },
            // We could also filter by tags if we added them
          ],
        },
      },
    );

    // 2. Launch it
    return this.campaignOrchestrator.execute(organizationId, campaign.id);
  }

  /**
   * Launch a targeted invitation campaign for an event.
   */
  async sendEventInvites(
    organizationId: string,
    eventId: string,
    userId: string,
    dto: SendEventInviteDto,
  ) {
    const event = await this.findOne(organizationId, eventId);

    if (event.status !== "published") {
      throw new BadRequestException(
        "Invitations can only be sent for published events",
      );
    }

    // 1. Create a Module Initiated Campaign
    const campaign = await this.campaignsService.create(
      organizationId,
      userId,
      {
        name: dto.name,
        type: CampaignType.MODULE_INITIATED,
        templateId: dto.templateId,
        templateParams: dto.templateParams,
        rawTemplate: dto.rawTemplate,
        audienceFilter: dto.audienceFilter,
        sourceModule: "eos",
        sourceReferenceId: eventId,
      },
    );

    // 2. Launch it
    return this.campaignOrchestrator.execute(organizationId, campaign.id);
  }

  /**
   * Get delivery stats for all campaigns linked to an event.
   */
  async getEventCampaignStats(organizationId: string, eventId: string) {
    const campaigns = await this.campaignRepo.find({
      where: {
        tenantId: organizationId,
        sourceModule: "eos",
        sourceReferenceId: eventId,
      },
      order: { createdAt: "DESC" },
    });

    // Aggregate stats could be more detailed, but for now we return the list
    return campaigns.map((c) => ({
      id: c.id,
      name: c.name,
      status: c.status,
      recipientCount: c.recipientCount,
      createdAt: c.createdAt,
      // In a real scenario, we'd fetch delivery stats (sent/delivered/read) from a separate service or table
    }));
  }

  /**
   * Schedule a reminder for an event.
   */
  async scheduleReminder(
    organizationId: string,
    eventId: string,
    userId: string,
    scheduledAt: Date,
    message: string,
  ) {
    return this.schedulerService.createSchedule({
      tenantId: organizationId,
      jobType: "eos.event_reminder",
      jobPayload: { eventId, userId, message },
      scheduledAt,
    });
  }

  /**
   * Retroactively sync metadata for all exhibitors and ticket holders of an event.
   */
  async syncMetadata(organizationId: string, eventId: string) {
    const event = await this.findOne(organizationId, eventId);

    // 1. Sync Exhibitors
    const exhibitors = await this.exhibitorRepo.find({
      where: { eventId },
      relations: ["contact"],
    });
    for (const exhibitor of exhibitors) {
      if (exhibitor.contact) {
        exhibitor.contact.metadata = {
          ...(exhibitor.contact.metadata || {}),
          exhibitorName: exhibitor.name,
          eventName: event.name,
          boothNumber: exhibitor.boothNumber || "",
          boothLink: exhibitor.boothToken
            ? `https://dashboard.chatnation.app/eos/booth/${exhibitor.boothToken}`
            : "",
        };
        await this.contactRepo.save(exhibitor.contact);
      }
    }

    // 2. Sync Tickets
    const tickets = await this.ticketRepo.find({
      where: { ticketType: { eventId: eventId } },
      relations: ["contact"],
    });
    for (const ticket of tickets) {
      if (ticket.contact) {
        ticket.contact.metadata = {
          ...(ticket.contact.metadata || {}),
          ticketCode: ticket.ticketCode,
          eventName: event.name,
        };
        await this.contactRepo.save(ticket.contact);
      }
    }

    return {
      syncedExhibitors: exhibitors.length,
      syncedTickets: tickets.length,
    };
  }

  /**
   * Global catch-up: Sync metadata for all published and ended events.
   */
  async backfillAllPublishedEvents() {
    const events = await this.eventRepo.find({
      where: [{ status: "published" }, { status: "ended" }],
    });

    let totalExhibitors = 0;
    let totalTickets = 0;

    for (const event of events) {
      const result = await this.syncMetadata(event.organizationId, event.id);
      totalExhibitors += result.syncedExhibitors;
      totalTickets += result.syncedTickets;
    }

    return {
      processedEvents: events.length,
      totalExhibitors,
      totalTickets,
    };
  }

  /**
   * Batch notify all invited exhibitors who haven't received their invites yet.
   */
  async batchNotifyExhibitors(organizationId: string, eventId: string) {
    const event = await this.findOne(organizationId, eventId);
    const exhibitors = await this.exhibitorRepo.find({
      where: { eventId, status: "invited" },
    });

    for (const exhibitor of exhibitors) {
      if (exhibitor.contactPhone) {
        await this.triggerService.fire(CampaignTrigger.EXHIBITOR_INVITED, {
          tenantId: organizationId,
          contactId: exhibitor.contactPhone,
          context: {
            eventName: event.name,
            exhibitorName: exhibitor.name,
            invitationLink: exhibitor.invitationToken
              ? `https://dashboard.chatnation.app/eos/onboarding/${exhibitor.invitationToken}`
              : "",
          },
        });
      }
    }

    return { notifiedCount: exhibitors.length };
  }

  /**
   * Aggregate event metrics: tickets, revenue, exhibitors, and check-ins.
   */
  async getEventMetrics(organizationId: string, eventId: string) {
    // 1. Verify event exists and belongs to org
    await this.findOne(organizationId, eventId);

    // 2. Aggregate Ticket Metrics
    const ticketMetrics = await this.ticketRepo
      .createQueryBuilder("ticket")
      .innerJoin("ticket.ticketType", "ticketType")
      .where("ticketType.eventId = :eventId", { eventId })
      .select("COUNT(ticket.id)", "totalTickets")
      .addSelect("SUM(ticket.amount_paid)", "totalRevenue")
      .addSelect(
        "COUNT(CASE WHEN ticket.checkedInAt IS NOT NULL THEN 1 END)",
        "checkIns",
      )
      .getRawOne();

    // 3. Count Exhibitors
    const exhibitorCount = await this.exhibitorRepo.count({
      where: { eventId },
    });

    return {
      totalTickets: parseInt(ticketMetrics.totalTickets || "0", 10),
      totalRevenue: parseFloat(ticketMetrics.totalRevenue || "0"),
      totalExhibitors: exhibitorCount,
      checkIns: parseInt(ticketMetrics.checkIns || "0", 10),
    };
  }
}
