/**
 * CampaignsService -- CRUD operations and status management for campaigns.
 */

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { CampaignEntity, CampaignStatus } from "@lib/database";
import { CreateCampaignDto } from "./dto/create-campaign.dto";
import { UpdateCampaignDto } from "./dto/update-campaign.dto";
import { CampaignQueryDto } from "./dto/campaign-query.dto";

@Injectable()
export class CampaignsService {
  private readonly logger = new Logger(CampaignsService.name);

  constructor(
    @InjectRepository(CampaignEntity)
    private readonly campaignRepo: Repository<CampaignEntity>,
  ) {}

  async create(
    tenantId: string,
    userId: string,
    dto: CreateCampaignDto,
  ): Promise<CampaignEntity> {
    const campaign = this.campaignRepo.create({
      tenantId,
      name: dto.name,
      type: dto.type,
      status: CampaignStatus.DRAFT,
      messageTemplate: dto.messageTemplate,
      audienceFilter: dto.audienceFilter
        ? (dto.audienceFilter as unknown as Record<string, unknown>)
        : null,
      sourceModule: dto.sourceModule ?? null,
      sourceReferenceId: dto.sourceReferenceId ?? null,
      scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
      triggerType: dto.triggerType ?? null,
      triggerConfig: dto.triggerConfig ?? null,
      createdBy: userId,
    });

    const saved = await this.campaignRepo.save(campaign);
    return saved;
  }

  async findById(
    tenantId: string,
    campaignId: string,
  ): Promise<CampaignEntity> {
    const campaign = await this.campaignRepo.findOne({
      where: { id: campaignId, tenantId },
    });
    if (!campaign) {
      throw new NotFoundException(`Campaign ${campaignId} not found`);
    }
    return campaign;
  }

  async list(
    tenantId: string,
    query: CampaignQueryDto,
  ): Promise<{ data: CampaignEntity[]; total: number; page: number; limit: number }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const qb = this.campaignRepo
      .createQueryBuilder("c")
      .where("c.tenantId = :tenantId", { tenantId });

    if (query.status) {
      qb.andWhere("c.status = :status", { status: query.status });
    }
    if (query.sourceModule) {
      qb.andWhere("c.sourceModule = :sourceModule", {
        sourceModule: query.sourceModule,
      });
    }

    qb.orderBy("c.createdAt", "DESC")
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit };
  }

  async update(
    tenantId: string,
    campaignId: string,
    dto: UpdateCampaignDto,
  ): Promise<CampaignEntity> {
    const campaign = await this.findById(tenantId, campaignId);

    if (campaign.status !== CampaignStatus.DRAFT) {
      throw new BadRequestException(
        "Only draft campaigns can be updated",
      );
    }

    if (dto.name !== undefined) campaign.name = dto.name;
    if (dto.messageTemplate !== undefined)
      campaign.messageTemplate = dto.messageTemplate;
    if (dto.audienceFilter !== undefined)
      campaign.audienceFilter = dto.audienceFilter
        ? (dto.audienceFilter as unknown as Record<string, unknown>)
        : null;
    if (dto.scheduledAt !== undefined)
      campaign.scheduledAt = dto.scheduledAt ? new Date(dto.scheduledAt) : null;
    if (dto.triggerType !== undefined)
      campaign.triggerType = dto.triggerType ?? null;
    if (dto.triggerConfig !== undefined)
      campaign.triggerConfig = dto.triggerConfig ?? null;

    return this.campaignRepo.save(campaign);
  }

  async updateStatus(
    campaignId: string,
    status: CampaignStatus,
    extra?: Partial<
      Pick<
        CampaignEntity,
        "startedAt" | "completedAt" | "estimatedCompletionAt" | "recipientCount"
      >
    >,
  ): Promise<void> {
    await this.campaignRepo.update(campaignId, { status, ...extra });
  }

  async cancel(
    tenantId: string,
    campaignId: string,
  ): Promise<CampaignEntity> {
    const campaign = await this.findById(tenantId, campaignId);

    const cancellable: CampaignStatus[] = [
      CampaignStatus.DRAFT,
      CampaignStatus.SCHEDULED,
      CampaignStatus.RUNNING,
      CampaignStatus.PAUSED,
    ];

    if (!cancellable.includes(campaign.status)) {
      throw new BadRequestException(
        `Campaign with status "${campaign.status}" cannot be cancelled`,
      );
    }

    campaign.status = CampaignStatus.CANCELLED;
    return this.campaignRepo.save(campaign);
  }
}
