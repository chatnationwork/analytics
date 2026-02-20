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
import { SchedulerService } from "@lib/database";
import { CAMPAIGN_JOB_TYPE } from "./constants";
import { AudienceService } from "./audience.service";
import { SegmentsService } from "./segments.service";
import { TemplatesService } from "../templates/templates.service";

@Injectable()
export class CampaignsService {
  private readonly logger = new Logger(CampaignsService.name);

  constructor(
    @InjectRepository(CampaignEntity)
    private readonly campaignRepo: Repository<CampaignEntity>,
    private readonly schedulerService: SchedulerService,
    private readonly audienceService: AudienceService,
    private readonly segmentsService: SegmentsService,
    private readonly templatesService: TemplatesService,
  ) {}

  async create(
    tenantId: string,
    userId: string,
    dto: CreateCampaignDto,
  ): Promise<CampaignEntity> {
    let messageTemplate = dto.messageTemplate;

    // specific logic if a templateId is provided
    if (dto.templateId) {
      const template = await this.templatesService.findById(
        tenantId,
        dto.templateId,
      );

      // Construct WhatsApp Template Payload
      messageTemplate = {
        type: "template",
        template: {
          name: template.name,
          language: { code: template.language },
          components: [],
        },
      };

      // Add Body Parameters if they exist
      if (dto.templateParams && Object.keys(dto.templateParams).length > 0) {
        const parameters = [];
        // Sort variables to ensure correct order {{1}}, {{2}}, ...
        const sortedVars = (template.variables || []).sort(
          (a, b) => parseInt(a) - parseInt(b),
        );

        for (const v of sortedVars) {
          const val = dto.templateParams[v] || "";
          parameters.push({
            type: "text",
            text: val, // Value will be rendered (placeholders replaced) in SendWorker
          });
        }

        if (parameters.length > 0) {
          (messageTemplate as any).template.components.push({
            type: "body",
            parameters: parameters,
          });
        }
      }
    } else if (dto.rawTemplate) {
      // If rawTemplate is provided, use it.
      // We support both a wrapped { type: "template", template: ... }
      // or just the { name: ..., language: ..., components: ... } object.
      if (dto.rawTemplate.template) {
        messageTemplate = dto.rawTemplate;
      } else {
        messageTemplate = {
          type: "template",
          template: dto.rawTemplate,
        };
      }
    }

    if (!messageTemplate) {
      throw new BadRequestException(
        "Either messageTemplate or templateId must be provided",
      );
    }

    let audienceFilter: Record<string, unknown> | null = dto.audienceFilter
      ? (dto.audienceFilter as unknown as Record<string, unknown>)
      : null;
    let segmentId: string | null = null;

    if (dto.segmentId && !audienceFilter) {
      const segment = await this.segmentsService.findById(tenantId, dto.segmentId);
      audienceFilter = segment.filter as Record<string, unknown>;
      segmentId = segment.id;
    }

    const campaign = this.campaignRepo.create({
      tenantId,
      name: dto.name,
      type: dto.type,
      status: CampaignStatus.DRAFT,
      messageTemplate: messageTemplate,
      audienceFilter,
      segmentId,
      sourceModule: dto.sourceModule ?? null,
      sourceReferenceId: dto.sourceReferenceId ?? null,
      scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
      triggerType: dto.triggerType ?? null,
      triggerConfig: dto.triggerConfig ?? null,
      createdBy: userId,
      templateId: dto.templateId ?? null,
      templateParams: dto.templateParams ?? null,
    });

    const saved: CampaignEntity = await this.campaignRepo.save(campaign);

    // Handle recurrence
    if (dto.recurrence) {
      const cron = this.generateCronExpression(dto.recurrence);

      // Calculate start date properly combining startDate and time
      const [hours, minutes] = dto.recurrence.time.split(":").map(Number);
      const startDate = new Date(dto.recurrence.startDate);
      startDate.setHours(hours, minutes, 0, 0);

      await this.schedulerService.createSchedule({
        tenantId,
        jobType: CAMPAIGN_JOB_TYPE,
        jobPayload: { campaignId: saved.id },
        cronExpression: cron,
        scheduledAt: startDate,
        createdBy: userId,
        metadata: { campaignName: saved.name },
      });

      saved.status = CampaignStatus.SCHEDULED;
      await this.campaignRepo.save(saved);
    } else if (dto.scheduledAt) {
      // One-time scheduled campaign: promote status so the cron picks it up
      saved.status = CampaignStatus.SCHEDULED;
      await this.campaignRepo.save(saved);
    }

    return saved;
  }

  private generateCronExpression(
    config: CreateCampaignDto["recurrence"],
  ): string {
    if (!config) throw new Error("Recurrence config missing");

    const [hours, minutes] = config.time.split(":");

    switch (config.frequency) {
      case "daily":
        return `${minutes} ${hours} * * *`;
      case "weekly":
        if (!config.daysOfWeek || config.daysOfWeek.length === 0) {
          throw new BadRequestException(
            "Days of week required for weekly recurrence",
          );
        }
        return `${minutes} ${hours} * * ${config.daysOfWeek.join(",")}`;
      case "monthly":
        if (!config.dayOfMonth) {
          throw new BadRequestException(
            "Day of month required for monthly recurrence",
          );
        }
        return `${minutes} ${hours} ${config.dayOfMonth} * *`;
      case "yearly":
        if (!config.dayOfMonth || config.monthOfYear === undefined) {
          throw new BadRequestException(
            "Day of month and month required for yearly recurrence",
          );
        }
        // Month in cron is 1-12, but input might be 0-11?
        // Plan said 0-11. Cron expects 1-12 (Jan-Dec) or JAN-DEC.
        // Let's assume input is 0-11 (JS Date style) and convert to 1-12.
        return `${minutes} ${hours} ${config.dayOfMonth} ${config.monthOfYear + 1} *`;
      default:
        throw new BadRequestException("Invalid frequency");
    }
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
  ): Promise<{
    data: CampaignEntity[];
    total: number;
    page: number;
    limit: number;
  }> {
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
    if (query.search?.trim()) {
      qb.andWhere("LOWER(c.name) LIKE LOWER(:search)", {
        search: `%${query.search.trim()}%`,
      });
    }
    if (query.dateFrom) {
      qb.andWhere(
        "(COALESCE(c.startedAt, c.scheduledAt, c.createdAt))::date >= (:dateFrom)::date",
        { dateFrom: query.dateFrom },
      );
    }
    if (query.dateTo) {
      qb.andWhere(
        "(COALESCE(c.startedAt, c.scheduledAt, c.createdAt))::date <= (:dateTo)::date",
        { dateTo: query.dateTo },
      );
    }
    if (query.isTemplate === true) {
      qb.andWhere("c.isTemplate = :isTemplate", { isTemplate: true });
    }

    qb.orderBy("c.createdAt", "DESC")
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit };
  }

  /**
   * Duplicate a campaign as a new draft (for rerun or save-as-template).
   * Copies messageTemplate, audienceFilter, segmentId, templateId, templateParams.
   */
  async duplicate(
    tenantId: string,
    userId: string,
    campaignId: string,
    opts?: { asTemplate?: boolean; nameSuffix?: string },
  ): Promise<CampaignEntity> {
    const source = await this.findById(tenantId, campaignId);

    const baseName = opts?.nameSuffix
      ? `${source.name} ${opts.nameSuffix}`
      : `${source.name} (Copy)`;

    const copy = this.campaignRepo.create({
      tenantId,
      name: baseName,
      type: source.type,
      status: CampaignStatus.DRAFT,
      messageTemplate: { ...source.messageTemplate },
      audienceFilter: source.audienceFilter
        ? (JSON.parse(JSON.stringify(source.audienceFilter)) as Record<string, unknown>)
        : null,
      segmentId: source.segmentId,
      templateId: source.templateId,
      templateParams: source.templateParams
        ? { ...source.templateParams }
        : null,
      sourceModule: source.sourceModule,
      sourceReferenceId: null,
      recipientCount: 0,
      scheduledAt: null,
      startedAt: null,
      completedAt: null,
      estimatedCompletionAt: null,
      triggerType: source.triggerType,
      triggerConfig: source.triggerConfig
        ? (JSON.parse(JSON.stringify(source.triggerConfig)) as Record<string, unknown>)
        : null,
      createdBy: userId,
      isTemplate: opts?.asTemplate ?? false,
    });

    return this.campaignRepo.save(copy);
  }

  async update(
    tenantId: string,
    campaignId: string,
    dto: UpdateCampaignDto,
  ): Promise<CampaignEntity> {
    const campaign = await this.findById(tenantId, campaignId);

    if (campaign.status !== CampaignStatus.DRAFT) {
      throw new BadRequestException("Only draft campaigns can be updated");
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
    if (dto.templateId !== undefined)
      campaign.templateId = dto.templateId ?? null;
    if (dto.templateParams !== undefined)
      campaign.templateParams = dto.templateParams ?? null;
    if (dto.isTemplate !== undefined) campaign.isTemplate = dto.isTemplate;

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

  async cancel(tenantId: string, campaignId: string): Promise<CampaignEntity> {
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
