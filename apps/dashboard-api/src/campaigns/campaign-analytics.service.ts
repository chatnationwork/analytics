/**
 * CampaignAnalyticsService -- aggregation queries for campaign performance metrics.
 */

import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import {
  CampaignMessageEntity,
  CampaignMessageStatus,
  CampaignEntity,
} from "@lib/database";

export interface CampaignMetrics {
  total: number;
  pending: number;
  queued: number;
  sent: number;
  delivered: number;
  read: number;
  failed: number;
  deliveryRate: number;
  readRate: number;
  failureRate: number;
}

export interface CampaignOverview {
  totalCampaigns: number;
  activeCampaigns: number;
  totalMessagesSent: number;
  totalDelivered: number;
  totalRead: number;
  totalFailed: number;
  avgDeliveryRate: number;
  avgReadRate: number;
}

@Injectable()
export class CampaignAnalyticsService {
  private readonly logger = new Logger(CampaignAnalyticsService.name);

  constructor(
    @InjectRepository(CampaignMessageEntity)
    private readonly messageRepo: Repository<CampaignMessageEntity>,
    @InjectRepository(CampaignEntity)
    private readonly campaignRepo: Repository<CampaignEntity>,
  ) {}

  /** Get delivery metrics for a single campaign. */
  async getCampaignMetrics(
    tenantId: string,
    campaignId: string,
  ): Promise<CampaignMetrics> {
    const rows = await this.messageRepo
      .createQueryBuilder("m")
      .select("m.status", "status")
      .addSelect("COUNT(*)::int", "count")
      .where("m.tenantId = :tenantId", { tenantId })
      .andWhere("m.campaignId = :campaignId", { campaignId })
      .groupBy("m.status")
      .getRawMany<{ status: string; count: number }>();

    const counts: Record<string, number> = {};
    let total = 0;
    for (const row of rows) {
      counts[row.status] = row.count;
      total += row.count;
    }

    const sent = counts[CampaignMessageStatus.SENT] ?? 0;
    const delivered = counts[CampaignMessageStatus.DELIVERED] ?? 0;
    const read = counts[CampaignMessageStatus.READ] ?? 0;
    const failed = counts[CampaignMessageStatus.FAILED] ?? 0;
    const sentTotal = sent + delivered + read;

    return {
      total,
      pending: counts[CampaignMessageStatus.PENDING] ?? 0,
      queued: counts[CampaignMessageStatus.QUEUED] ?? 0,
      sent,
      delivered,
      read,
      failed,
      deliveryRate: sentTotal > 0 ? ((delivered + read) / sentTotal) * 100 : 0,
      readRate: sentTotal > 0 ? (read / sentTotal) * 100 : 0,
      failureRate: total > 0 ? (failed / total) * 100 : 0,
    };
  }

  /** Get per-recipient delivery log for a campaign (paginated). */
  async getCampaignMessages(
    tenantId: string,
    campaignId: string,
    page: number = 1,
    limit: number = 50,
  ): Promise<{
    data: CampaignMessageEntity[];
    total: number;
    page: number;
    limit: number;
  }> {
    const [data, total] = await this.messageRepo.findAndCount({
      where: { tenantId, campaignId },
      order: { createdAt: "DESC" },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { data, total, page, limit };
  }

  /** Get cross-campaign overview metrics for a tenant. */
  async getOverview(tenantId: string): Promise<CampaignOverview> {
    const [totalCampaigns, activeCampaigns] = await Promise.all([
      this.campaignRepo.count({ where: { tenantId } }),
      this.campaignRepo.count({
        where: { tenantId, status: "running" as any },
      }),
    ]);

    const stats = await this.messageRepo
      .createQueryBuilder("m")
      .select("m.status", "status")
      .addSelect("COUNT(*)::int", "count")
      .where("m.tenantId = :tenantId", { tenantId })
      .groupBy("m.status")
      .getRawMany<{ status: string; count: number }>();

    const counts: Record<string, number> = {};
    for (const row of stats) {
      counts[row.status] = row.count;
    }

    const totalSent =
      (counts[CampaignMessageStatus.SENT] ?? 0) +
      (counts[CampaignMessageStatus.DELIVERED] ?? 0) +
      (counts[CampaignMessageStatus.READ] ?? 0);
    const totalDelivered =
      (counts[CampaignMessageStatus.DELIVERED] ?? 0) +
      (counts[CampaignMessageStatus.READ] ?? 0);
    const totalRead = counts[CampaignMessageStatus.READ] ?? 0;
    const totalFailed = counts[CampaignMessageStatus.FAILED] ?? 0;

    return {
      totalCampaigns,
      activeCampaigns,
      totalMessagesSent: totalSent,
      totalDelivered,
      totalRead,
      totalFailed,
      avgDeliveryRate: totalSent > 0 ? (totalDelivered / totalSent) * 100 : 0,
      avgReadRate: totalSent > 0 ? (totalRead / totalSent) * 100 : 0,
    };
  }

  /** Get error breakdown for a campaign. */
  async getErrorBreakdown(
    tenantId: string,
    campaignId: string,
  ): Promise<Array<{ errorCode: string | null; errorMessage: string | null; count: number }>> {
    return this.messageRepo
      .createQueryBuilder("m")
      .select("m.errorCode", "errorCode")
      .addSelect("m.errorMessage", "errorMessage")
      .addSelect("COUNT(*)::int", "count")
      .where("m.tenantId = :tenantId", { tenantId })
      .andWhere("m.campaignId = :campaignId", { campaignId })
      .andWhere("m.status = :status", { status: CampaignMessageStatus.FAILED })
      .groupBy("m.errorCode")
      .addGroupBy("m.errorMessage")
      .orderBy("count", "DESC")
      .getRawMany();
  }
}
