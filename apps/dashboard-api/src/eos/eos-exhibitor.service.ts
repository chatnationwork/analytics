import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { EosExhibitor, ContactEntity, EosEvent } from "@lib/database";
import { CreateExhibitorDto } from "./dto/create-exhibitor.dto";
import { nanoid } from "nanoid";
import { TriggerService } from "../campaigns/trigger.service";
import { CampaignTrigger } from "../campaigns/constants";

@Injectable()
export class EosExhibitorService {
  constructor(
    @InjectRepository(EosExhibitor)
    private readonly exhibitorRepo: Repository<EosExhibitor>,
    @InjectRepository(ContactEntity)
    private readonly contactRepo: Repository<ContactEntity>,
    @InjectRepository(EosEvent)
    private readonly eventRepo: Repository<EosEvent>,
    private readonly triggerService: TriggerService,
  ) {}

  async invite(eventId: string, dto: CreateExhibitorDto) {
    const event = await this.eventRepo.findOne({ where: { id: eventId } });
    if (!event) throw new NotFoundException("Event not found");

    const invitationToken = nanoid(32);

    // Resolve Contact (same logic as create)
    let contactId: string | undefined;
    if (dto.contactPhone) {
      let contact = await this.contactRepo.findOne({
        where: {
          tenantId: event.organizationId,
          contactId: dto.contactPhone,
        },
      });

      if (!contact) {
        contact = this.contactRepo.create({
          tenantId: event.organizationId,
          contactId: dto.contactPhone,
          name: dto.contactName,
          email: dto.contactEmail,
          firstSeen: new Date(),
          lastSeen: new Date(),
        });
        contact = await this.contactRepo.save(contact);
      }
      contactId = contact.id;
    }

    const exhibitor = this.exhibitorRepo.create({
      ...dto,
      eventId,
      organizationId: event.organizationId,
      contactId,
      status: "invited",
      invitationToken,
      invitedAt: new Date(),
    });

    const saved = await this.exhibitorRepo.save(exhibitor);

    // Fire Trigger
    await this.triggerService.fire(CampaignTrigger.EXHIBITOR_INVITED, {
      tenantId: event.organizationId,
      contactId: dto.contactPhone,
      context: {
        eventName: event.name,
        exhibitorName: dto.name,
        invitationLink: `https://dashboard.chatnation.app/eos/onboarding/${invitationToken}`, // Placeholder domain
      },
    });

    return saved;
  }

  async create(eventId: string, dto: CreateExhibitorDto) {
    // 1. Get Event to know organization
    const event = await this.eventRepo.findOne({ where: { id: eventId } });
    if (!event) throw new NotFoundException("Event not found");

    // 2. Resolve Contact
    let contactId: string | undefined;

    if (dto.contactPhone) {
      let contact = await this.contactRepo.findOne({
        where: {
          tenantId: event.organizationId,
          contactId: dto.contactPhone,
        },
      });

      if (!contact) {
        contact = this.contactRepo.create({
          tenantId: event.organizationId,
          contactId: dto.contactPhone,
          name: dto.contactName,
          email: dto.contactEmail,
          firstSeen: new Date(),
          lastSeen: new Date(),
        });
        contact = await this.contactRepo.save(contact);
      }
      contactId = contact.id;
    }

    // 3. Create Exhibitor
    const exhibitor = this.exhibitorRepo.create({
      ...dto,
      eventId,
      organizationId: event.organizationId, // Populate redundant orgId for easier RLS
      contactId,
      status: "pending",
    });
    return this.exhibitorRepo.save(exhibitor);
  }

  async findAll(eventId: string) {
    return this.exhibitorRepo.find({
      where: { eventId },
      order: { createdAt: "DESC" },
      relations: ["contact"], // Include contact details
    });
  }

  async findOne(id: string) {
    const exhibitor = await this.exhibitorRepo.findOne({
      where: { id },
      relations: ["contact"],
    });
    if (!exhibitor) throw new NotFoundException("Exhibitor not found");
    return exhibitor;
  }

  async findByToken(token: string) {
    return this.exhibitorRepo.findOne({
      where: { invitationToken: token },
      relations: ["contact"],
    });
  }

  async update(id: string, updates: any) {
    const exhibitor = await this.findOne(id);
    Object.assign(exhibitor, updates);
    return this.exhibitorRepo.save(exhibitor);
  }

  async updateStatus(id: string, status: "approved" | "rejected") {
    const exhibitor = await this.findOne(id);
    exhibitor.status = status;
    return this.exhibitorRepo.save(exhibitor);
  }

  async remove(id: string) {
    return this.exhibitorRepo.delete(id);
  }
}
