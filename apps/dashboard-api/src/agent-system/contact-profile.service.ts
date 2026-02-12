/**
 * Contact profile service – get/update contact, notes, and profile history.
 */

import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ContactRepository } from "@lib/database";
import { ContactNoteEntity } from "@lib/database/entities/contact-note.entity";
import { ResolutionEntity } from "@lib/database/entities/resolution.entity";
import { AuditService, AuditActions } from "../audit/audit.service";
import { UserRepository } from "@lib/database";

export interface ContactProfileDto {
  contactId: string;
  name: string | null;
  pin: string | null;
  yearOfBirth: number | null;
  email: string | null;
  metadata: Record<string, string> | null;
  firstSeen: string;
  lastSeen: string;
  messageCount: number;
}

export interface UpdateContactProfileDto {
  name?: string | null;
  pin?: string | null;
  yearOfBirth?: number | null;
  email?: string | null;
  metadata?: Record<string, string> | null;
}

export interface ContactNoteDto {
  id: string;
  content: string;
  authorId: string;
  authorName: string | null;
  createdAt: string;
}

export interface ContactHistoryEntryDto {
  id: string;
  action: string;
  actorId: string | null;
  actorName: string | null;
  details: Record<string, unknown> | null;
  createdAt: string;
}

/** A single wrap-up report (resolution) for a contact's past session */
export interface ContactResolutionDto {
  id: string;
  sessionId: string;
  category: string;
  outcome: string;
  notes: string | null;
  formData: Record<string, string | number | boolean> | null;
  resolvedByAgentId: string;
  resolvedByAgentName: string | null;
  createdAt: string;
}

@Injectable()
export class ContactProfileService {
  constructor(
    private readonly contactRepository: ContactRepository,
    @InjectRepository(ContactNoteEntity)
    private readonly noteRepo: Repository<ContactNoteEntity>,
    @InjectRepository(ResolutionEntity)
    private readonly resolutionRepo: Repository<ResolutionEntity>,
    private readonly auditService: AuditService,
    private readonly userRepository: UserRepository,
  ) {}

  async getContact(
    tenantId: string,
    contactId: string,
    name?: string | null,
  ): Promise<ContactProfileDto> {
    const c = await this.contactRepository.findOneOrCreate(
      tenantId,
      contactId,
      name,
    );
    return this.toProfileDto(c);
  }

  async searchContacts(
    tenantId: string,
    query: string,
    limit = 20,
  ): Promise<ContactProfileDto[]> {
    const contacts = await this.contactRepository.search(
      tenantId,
      query,
      limit,
    );
    return contacts.map((c) => this.toProfileDto(c));
  }

  async updateContact(
    tenantId: string,
    contactId: string,
    userId: string,
    dto: UpdateContactProfileDto,
    requestContext?: { ip?: string | null; userAgent?: string | null },
  ): Promise<ContactProfileDto> {
    const existing = await this.contactRepository.findOne(tenantId, contactId);
    if (!existing) {
      throw new NotFoundException("Contact not found");
    }

    const updates: UpdateContactProfileDto = {};
    const details: Record<string, { old: unknown; new: unknown }> = {};

    if (dto.name !== undefined && dto.name !== existing.name) {
      updates.name = dto.name;
      details.name = { old: existing.name, new: dto.name };
    }
    if (dto.pin !== undefined && dto.pin !== existing.pin) {
      updates.pin = dto.pin;
      details.pin = { old: existing.pin, new: dto.pin };
    }
    if (
      dto.yearOfBirth !== undefined &&
      dto.yearOfBirth !== existing.yearOfBirth
    ) {
      updates.yearOfBirth = dto.yearOfBirth;
      details.yearOfBirth = { old: existing.yearOfBirth, new: dto.yearOfBirth };
    }
    if (dto.email !== undefined && dto.email !== existing.email) {
      updates.email = dto.email;
      details.email = { old: existing.email, new: dto.email };
    }
    if (dto.metadata !== undefined) {
      updates.metadata = dto.metadata;
      details.metadata = { old: existing.metadata, new: dto.metadata };
    }

    if (Object.keys(updates).length === 0) {
      return this.toProfileDto(existing);
    }

    const updated = await this.contactRepository.updateProfile(
      tenantId,
      contactId,
      updates,
    );
    if (!updated) throw new NotFoundException("Contact not found");

    await this.auditService.log({
      tenantId,
      actorId: userId,
      actorType: "user",
      action: AuditActions.CONTACT_PROFILE_UPDATED,
      resourceType: "contact",
      resourceId: contactId,
      details: { changes: details },
      requestContext,
    });

    return this.toProfileDto(updated);
  }

  async getNotes(
    tenantId: string,
    contactId: string,
    limit = 50,
  ): Promise<ContactNoteDto[]> {
    const notes = await this.noteRepo.find({
      where: { tenantId, contactId },
      order: { createdAt: "DESC" },
      take: limit,
      relations: ["author"],
    });
    return notes.map((n) => ({
      id: n.id,
      content: n.content,
      authorId: n.authorId,
      authorName: n.author?.name ?? "Agent",
      createdAt: n.createdAt.toISOString(),
    }));
  }

  async addNote(
    tenantId: string,
    contactId: string,
    authorId: string,
    content: string,
  ): Promise<ContactNoteDto> {
    const contact = await this.contactRepository.findOne(tenantId, contactId);
    if (!contact) throw new NotFoundException("Contact not found");

    const note = this.noteRepo.create({
      tenantId,
      contactId,
      authorId,
      content: content.trim(),
    });
    const saved = await this.noteRepo.save(note);
    const withAuthor = await this.noteRepo.findOne({
      where: { id: saved.id },
      relations: ["author"],
    });
    return {
      id: saved.id,
      content: saved.content,
      authorId: saved.authorId,
      authorName: withAuthor?.author?.name ?? "Agent",
      createdAt: saved.createdAt.toISOString(),
    };
  }

  async getContactHistory(
    tenantId: string,
    contactId: string,
    page = 1,
    limit = 20,
  ): Promise<{ data: ContactHistoryEntryDto[]; total: number }> {
    const { data, total } = await this.auditService.list(tenantId, {
      resourceType: "contact",
      resourceId: contactId,
      page,
      limit,
    });
    const actorIds = [
      ...new Set(data.map((a) => a.actorId).filter(Boolean)),
    ] as string[];
    const users =
      actorIds.length > 0
        ? await Promise.all(
            actorIds.map((id) => this.userRepository.findById(id)),
          )
        : [];
    const nameMap = new Map(
      actorIds.map((id, i) => [id, users[i]?.name ?? null]),
    );

    const entries: ContactHistoryEntryDto[] = data.map((a) => ({
      id: a.id,
      action: a.action,
      actorId: a.actorId,
      actorName: a.actorId ? (nameMap.get(a.actorId) ?? null) : null,
      details: a.details,
      createdAt: a.createdAt.toISOString(),
    }));

    return { data: entries, total };
  }

  /**
   * List wrap-up reports (resolutions) for this contact, i.e. past sessions
   * that were resolved with category/notes/formData. Used by the contact
   * card History tab.
   */
  async getContactResolutions(
    tenantId: string,
    contactId: string,
    page = 1,
    limit = 20,
  ): Promise<{ data: ContactResolutionDto[]; total: number }> {
    const qb = this.resolutionRepo
      .createQueryBuilder("r")
      .innerJoin("r.session", "s")
      .where("s.tenantId = :tenantId", { tenantId })
      .andWhere("s.contactId = :contactId", { contactId })
      .orderBy("r.createdAt", "DESC")
      .skip((Math.max(page, 1) - 1) * limit)
      .take(limit);

    const [rows, total] = await qb.getManyAndCount();

    const agentIds = [
      ...new Set(rows.map((r) => r.resolvedByAgentId).filter(Boolean)),
    ];
    const users =
      agentIds.length > 0
        ? await Promise.all(
            agentIds.map((id) => this.userRepository.findById(id)),
          )
        : [];
    const nameMap = new Map(
      agentIds.map((id, i) => [id, users[i]?.name ?? null]),
    );

    const data: ContactResolutionDto[] = rows.map((r) => ({
      id: r.id,
      sessionId: r.sessionId,
      category: r.category,
      outcome: r.outcome,
      notes: r.notes ?? null,
      formData: r.formData ?? null,
      resolvedByAgentId: r.resolvedByAgentId,
      resolvedByAgentName: nameMap.get(r.resolvedByAgentId) ?? null,
      createdAt: r.createdAt.toISOString(),
    }));

    return { data, total };
  }

  private toProfileDto(c: {
    contactId: string;
    name: string | null;
    pin: string | null;
    yearOfBirth?: number | null;
    email: string | null;
    metadata: Record<string, string> | null;
    firstSeen: Date;
    lastSeen: Date;
    messageCount: number;
  }): ContactProfileDto {
    return {
      contactId: c.contactId,
      name: c.name ?? null,
      pin: c.pin ?? null,
      yearOfBirth: c.yearOfBirth ?? null,
      email: c.email ?? null,
      metadata: c.metadata ?? null,
      firstSeen: c.firstSeen.toISOString(),
      lastSeen: c.lastSeen.toISOString(),
      messageCount: c.messageCount,
    };
  }
}
