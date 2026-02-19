import { Injectable, BadRequestException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { EosEvent, IdentityEntity } from "@lib/database";
import { EosExhibitor } from "@lib/database";
import { EosTicketType } from "@lib/database";
import { CreateEventDto } from "./dto/create-event.dto";

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

    const event = this.eventRepo.create({
      ...dto,
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

    // Validate at least one ticket type
    const ticketCount = await this.ticketTypeRepo.count({ where: { eventId } });
    if (ticketCount === 0) {
      throw new BadRequestException(
        "Cannot publish event without ticket types",
      );
    }

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

  async completeEvent(organizationId: string, id: string): Promise<EosEvent> {
    const event = await this.findOne(organizationId, id);
    event.status = "completed";
    return this.eventRepo.save(event);
  }
}
