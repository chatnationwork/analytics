/**
 * SegmentsService -- CRUD for saved contact segment definitions.
 * Delegates filter evaluation to AudienceService.
 */

import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ContactSegmentEntity } from "@lib/database";
import { AudienceService } from "./audience.service";
import { CreateSegmentDto } from "./dto/create-segment.dto";
import { UpdateSegmentDto } from "./dto/create-segment.dto";
import type { AudienceFilter } from "./audience.service";

@Injectable()
export class SegmentsService {
  constructor(
    @InjectRepository(ContactSegmentEntity)
    private readonly segmentRepo: Repository<ContactSegmentEntity>,
    private readonly audienceService: AudienceService,
  ) {}

  async list(tenantId: string): Promise<ContactSegmentEntity[]> {
    return this.segmentRepo.find({
      where: { tenantId },
      order: { updatedAt: "DESC" },
    });
  }

  async findById(tenantId: string, id: string): Promise<ContactSegmentEntity> {
    const segment = await this.segmentRepo.findOne({
      where: { id, tenantId },
    });
    if (!segment) {
      throw new NotFoundException(`Segment ${id} not found`);
    }
    return segment;
  }

  async create(
    tenantId: string,
    dto: CreateSegmentDto,
  ): Promise<ContactSegmentEntity> {
    const segment = this.segmentRepo.create({
      tenantId,
      name: dto.name,
      description: dto.description ?? null,
      filter: dto.filter as unknown as Record<string, unknown>,
    });
    const saved = await this.segmentRepo.save(segment);
    await this.refreshContactCount(tenantId, saved.id);
    return this.findById(tenantId, saved.id);
  }

  async update(
    tenantId: string,
    id: string,
    dto: UpdateSegmentDto,
  ): Promise<ContactSegmentEntity> {
    const segment = await this.findById(tenantId, id);
    if (dto.name !== undefined) segment.name = dto.name;
    if (dto.description !== undefined) segment.description = dto.description ?? null;
    if (dto.filter !== undefined) segment.filter = dto.filter as unknown as Record<string, unknown>;
    await this.segmentRepo.save(segment);
    await this.refreshContactCount(tenantId, id);
    return this.findById(tenantId, id);
  }

  async delete(tenantId: string, id: string): Promise<void> {
    const segment = await this.findById(tenantId, id);
    await this.segmentRepo.remove(segment);
  }

  /** Refresh cached contact count for a segment. */
  private async refreshContactCount(tenantId: string, id: string): Promise<void> {
    const segment = await this.segmentRepo.findOne({
      where: { id, tenantId },
    });
    if (!segment) return;
    const count = await this.audienceService.countContacts(
      tenantId,
      segment.filter as unknown as AudienceFilter,
    );
    await this.segmentRepo.update(id, {
      contactCount: count,
      lastCountedAt: new Date(),
    });
  }

  /** Preview contact count for a filter (without saving). */
  async preview(tenantId: string, filter: AudienceFilter | null) {
    return this.audienceService.countContactsWithWindowSplit(tenantId, filter);
  }
}
