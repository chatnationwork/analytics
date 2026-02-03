/**
 * Audit log repository – append-only write, list with filters.
 */

import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, Between } from "typeorm";
import { AuditLogEntity, AuditActorType } from "../entities/audit-log.entity";

export interface CreateAuditLogDto {
  tenantId: string;
  actorId?: string | null;
  actorType: AuditActorType;
  action: string;
  resourceType?: string | null;
  resourceId?: string | null;
  details?: Record<string, unknown> | null;
  ip?: string | null;
  userAgent?: string | null;
}

@Injectable()
export class AuditLogRepository {
  constructor(
    @InjectRepository(AuditLogEntity)
    private readonly repo: Repository<AuditLogEntity>,
  ) {}

  async create(dto: CreateAuditLogDto): Promise<AuditLogEntity> {
    const entry = this.repo.create({
      tenantId: dto.tenantId,
      actorId: dto.actorId ?? null,
      actorType: dto.actorType,
      action: dto.action,
      resourceType: dto.resourceType ?? null,
      resourceId: dto.resourceId ?? null,
      details: dto.details ?? null,
      ip: dto.ip ?? null,
      userAgent: dto.userAgent ?? null,
    });
    return this.repo.save(entry);
  }

  async list(
    tenantId: string,
    options: {
      startDate?: Date;
      endDate?: Date;
      action?: string;
      actorId?: string;
      resourceType?: string;
      resourceId?: string;
      page?: number;
      limit?: number;
    } = {},
  ): Promise<{
    data: AuditLogEntity[];
    total: number;
    page: number;
    limit: number;
  }> {
    const {
      startDate,
      endDate,
      action,
      actorId,
      resourceType,
      resourceId,
      page = 1,
      limit = 50,
    } = options;
    const qb = this.repo
      .createQueryBuilder("a")
      .where("a.tenantId = :tenantId", { tenantId })
      .orderBy("a.createdAt", "DESC");

    if (startDate) qb.andWhere("a.createdAt >= :startDate", { startDate });
    if (endDate) qb.andWhere("a.createdAt <= :endDate", { endDate });
    if (action) qb.andWhere("a.action = :action", { action });
    if (actorId) qb.andWhere("a.actorId = :actorId", { actorId });
    if (resourceType)
      qb.andWhere("a.resourceType = :resourceType", { resourceType });
    if (resourceId) qb.andWhere("a.resourceId = :resourceId", { resourceId });

    const total = await qb.getCount();
    const data = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    return { data, total, page, limit };
  }
}
