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

import { TemplatesService } from "../templates/templates.service";

@Injectable()
export class CampaignsService {
  private readonly logger = new Logger(CampaignsService.name);

  constructor(
    @InjectRepository(CampaignEntity)
    private readonly campaignRepo: Repository<CampaignEntity>,
    private readonly schedulerService: SchedulerService,
    private readonly audienceService: AudienceService, // Wait, audienceService was missing in previous view? Check constructor args.
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
      const template = await this.templatesService.findById(tenantId, dto.templateId);
      
      // Construct WhatsApp Template Payload
      messageTemplate = {
        type: "template",
        template: {
          name: template.name,
          language: { code: template.language },
          components: [],
        }
      };

      // Add Body Parameters if they exist
      if (dto.templateParams && Object.keys(dto.templateParams).length > 0) {
        const parameters = [];
        // Sort variables to ensure correct order {{1}}, {{2}}, ...
        const sortedVars = (template.variables || []).sort((a, b) => parseInt(a) - parseInt(b));

        for (const v of sortedVars) {
          const val = dto.templateParams[v] || ""; 
          parameters.push({
            type: "text",
            text: val // Value will be rendered (placeholders replaced) in SendWorker
          });
        }

        if (parameters.length > 0) {
          (messageTemplate as any).template.components.push({
            type: "body",
            parameters: parameters
          });
        }
      }
    }

    if (!messageTemplate) {
        throw new BadRequestException("Either messageTemplate or templateId must be provided");
    }

    const campaign = this.campaignRepo.create({
      tenantId,
      name: dto.name,
      type: dto.type,
      status: CampaignStatus.DRAFT,
      messageTemplate: messageTemplate,
      audienceFilter: dto.audienceFilter
        ? (dto.audienceFilter as unknown as Record<string, unknown>)
        : null,
      sourceModule: dto.sourceModule ?? null,
      sourceReferenceId: dto.sourceReferenceId ?? null,
      scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
      triggerType: dto.triggerType ?? null,
      triggerConfig: dto.triggerConfig ?? null,
      createdBy: userId,
      templateId: dto.templateId ?? null,
      templateParams: dto.templateParams ?? null,
    });

    const saved = await this.campaignRepo.save(campaign);

    // Handle recurrence
    if (dto.recurrence) {
      const cron = this.generateCronExpression(dto.recurrence);

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

  private generateCronExpression(config: CreateCampaignDto["recurrence"]): string {
    if (!config) throw new Error("Recurrence config missing");
    
    const [hours, minutes] = config.time.split(":");
    
    switch (config.frequency) {
      case "daily":
        return `${minutes} ${hours} * * *`;
      case "weekly":
        if (!config.daysOfWeek || config.daysOfWeek.length === 0) {
           throw new BadRequestException("Days of week required for weekly recurrence");
        }
        return `${minutes} ${hours} * * ${config.daysOfWeek.join(",")}`;
      case "monthly":
        if (!config.dayOfMonth) {
           throw new BadRequestException("Day of month required for monthly recurrence");
        }
        return `${minutes} ${hours} ${config.dayOfMonth} * *`;
      case "yearly":
        if (!config.dayOfMonth || config.monthOfYear === undefined) {
           throw new BadRequestException("Day of month and month required for yearly recurrence");
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
    if (dto.templateId !== undefined)
      campaign.templateId = dto.templateId ?? null;
    if (dto.templateParams !== undefined)
      campaign.templateParams = dto.templateParams ?? null;

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
