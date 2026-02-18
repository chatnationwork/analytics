import { Injectable, BadRequestException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { EosEvent } from "@lib/database";
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
  ) {}

  async createEvent(
    organizationId: string,
    dto: CreateEventDto,
  ): Promise<EosEvent> {
    if (new Date(dto.startsAt) >= new Date(dto.endsAt)) {
      throw new BadRequestException("Start date must be before end date");
    }

    const event = this.eventRepo.create({
      ...dto,
      organizationId,
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
    organizationId: string,
    eventId: string,
    updates: Partial<EosEvent>,
  ): Promise<EosEvent> {
    const event = await this.findOne(organizationId, eventId);
    Object.assign(event, updates);
    return this.eventRepo.save(event);
  }
}
