import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { EosSpeaker, ContactEntity } from "@lib/database";
import { CreateSpeakerDto } from "./dto/create-speaker.dto";
import { nanoid } from "nanoid";

@Injectable()
export class EosSpeakerService {
  constructor(
    @InjectRepository(EosSpeaker)
    private readonly speakerRepo: Repository<EosSpeaker>,
    @InjectRepository(ContactEntity)
    private readonly contactRepo: Repository<ContactEntity>,
  ) {}

  async create(
    organizationId: string,
    eventId: string,
    dto: CreateSpeakerDto,
  ): Promise<EosSpeaker> {
    // 1. Handle Contact resolution if phone/email provided
    let contactId: string | undefined;
    if (dto.contactPhone || dto.contactEmail) {
      let contact = await this.contactRepo.findOne({
        where: [
          { tenantId: organizationId, contactId: dto.contactPhone },
          { tenantId: organizationId, email: dto.contactEmail },
        ],
      });

      if (!contact && dto.contactPhone) {
        contact = this.contactRepo.create({
          tenantId: organizationId,
          contactId: dto.contactPhone,
          name: dto.name,
          email: dto.contactEmail,
        });
        contact = await this.contactRepo.save(contact);
      }
      contactId = contact?.id;
    }

    // 2. Create Speaker
    const speaker = this.speakerRepo.create({
      ...dto,
      eventId,
      organizationId,
      contactId,
      invitationToken: nanoid(32),
      status: "pending",
      sessionTime: dto.sessionTime ? new Date(dto.sessionTime) : undefined,
    });

    return this.speakerRepo.save(speaker);
  }

  async findAll(eventId: string): Promise<EosSpeaker[]> {
    return this.speakerRepo.find({
      where: { eventId },
      relations: ["contact"],
      order: { createdAt: "DESC" },
    });
  }

  async findOne(id: string): Promise<EosSpeaker> {
    const speaker = await this.speakerRepo.findOne({
      where: { id },
      relations: ["event", "contact"],
    });

    if (!speaker) {
      throw new NotFoundException("Speaker not found");
    }

    return speaker;
  }

  async update(
    id: string,
    dto: Partial<CreateSpeakerDto>,
  ): Promise<EosSpeaker> {
    const speaker = await this.findOne(id);

    if (dto.sessionTime) {
      (speaker as any).sessionTime = new Date(dto.sessionTime);
      delete dto.sessionTime;
    }

    Object.assign(speaker, dto);
    return this.speakerRepo.save(speaker);
  }

  async delete(id: string): Promise<void> {
    const speaker = await this.findOne(id);
    await this.speakerRepo.remove(speaker);
  }

  async findByToken(token: string): Promise<EosSpeaker> {
    const speaker = await this.speakerRepo.findOne({
      where: { invitationToken: token },
      relations: ["event"],
    });

    if (!speaker) {
      throw new NotFoundException("Invalid speaker token");
    }

    return speaker;
  }
}
