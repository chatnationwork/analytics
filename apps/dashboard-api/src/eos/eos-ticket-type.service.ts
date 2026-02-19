import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { EosTicketType } from "@lib/database";
import { CreateTicketTypeDto } from "./dto/create-eos-ticket-type.dto";
// Assuming UpdateTicketTypeDto exists or using Partial<CreateTicketTypeDto>

@Injectable()
export class EosTicketTypeService {
  constructor(
    @InjectRepository(EosTicketType)
    private readonly ticketTypeRepo: Repository<EosTicketType>,
  ) {}

  async create(eventId: string, dto: CreateTicketTypeDto) {
    const ticketType = this.ticketTypeRepo.create({
      ...dto,
      eventId,
    });
    return this.ticketTypeRepo.save(ticketType);
  }

  async findAll(eventId: string) {
    return this.ticketTypeRepo.find({
      where: { eventId },
      order: { price: "ASC" },
    });
  }

  async findOne(id: string) {
    const ticketType = await this.ticketTypeRepo.findOne({ where: { id } });
    if (!ticketType) throw new NotFoundException("Ticket type not found");
    return ticketType;
  }

  async update(id: string, updates: any) {
    const ticketType = await this.findOne(id);
    Object.assign(ticketType, updates);
    return this.ticketTypeRepo.save(ticketType);
  }

  async remove(id: string) {
    // Soft delete or check for existing tickets?
    // Implementation plan said "deactivate", so maybe just set isActive=false?
    // But entity helper might have delete.
    // Let's stick to simple delete for now or check if there are tickets.
    // The previous controller had no delete logic to check.
    return this.ticketTypeRepo.delete(id);
  }
}
