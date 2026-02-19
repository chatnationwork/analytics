import { Injectable, BadRequestException, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { EosEvent, IdentityEntity, EosTicket } from "@lib/database";
import { EosExhibitor } from "@lib/database";
import { EosTicketType } from "@lib/database";
import { CreateEventDto } from "./dto/create-event.dto";
import { TriggerService } from "../campaigns/trigger.service";
import { CampaignTrigger } from "../campaigns/constants";

@Injectable()
export class EosEventService {
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
    private readonly triggerService: TriggerService,
  ) {}

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

  async publishEvent(
    organizationId: string,
    eventId: string,
  ): Promise<EosEvent> {
    const event = await this.findOne(organizationId, eventId);

    event.status = "published";
    event.publishedAt = new Date();
    return this.eventRepo.save(event);
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
    new Logger(EosEventService.name).log(
      `Event ${event.name} finalized. ${tickets.length} attendees processed.`,
    );
  }
}
