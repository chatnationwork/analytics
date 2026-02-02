/**
 * Contact repository – upsert on message.received, list with pagination.
 */

import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ContactEntity } from "../entities/contact.entity";

@Injectable()
export class ContactRepository {
  constructor(
    @InjectRepository(ContactEntity)
    private readonly repo: Repository<ContactEntity>,
  ) {}

  /**
   * Create or update a contact when a message.received is processed.
   * New contact: firstSeen = lastSeen = timestamp, messageCount = 1.
   * Existing: lastSeen = timestamp, messageCount += 1, optionally update name.
   */
  async upsertFromMessageReceived(
    tenantId: string,
    contactId: string,
    timestamp: Date,
    name?: string | null,
  ): Promise<ContactEntity> {
    const existing = await this.repo.findOne({
      where: { tenantId, contactId },
    });
    if (existing) {
      existing.lastSeen = timestamp;
      existing.messageCount += 1;
      if (name != null && name !== "") {
        existing.name = name;
      }
      return this.repo.save(existing);
    }
    const created = this.repo.create({
      tenantId,
      contactId,
      name: name || null,
      firstSeen: timestamp,
      lastSeen: timestamp,
      messageCount: 1,
    });
    return this.repo.save(created);
  }

  /**
   * List contacts for a tenant with pagination, ordered by lastSeen desc.
   */
  async getList(
    tenantId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{
    data: ContactEntity[];
    total: number;
    page: number;
    limit: number;
  }> {
    const [data, total] = await this.repo.findAndCount({
      where: { tenantId },
      order: { lastSeen: "DESC" },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, total, page, limit };
  }

  /** Total contact count for a tenant (from contacts table). */
  async getTotalCount(tenantId: string): Promise<number> {
    return this.repo.count({ where: { tenantId } });
  }

  /** Count contacts whose firstSeen is within the date range (new in period). */
  async getNewContactsInPeriod(
    tenantId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<number> {
    return this.repo
      .createQueryBuilder("c")
      .where("c.tenantId = :tenantId", { tenantId })
      .andWhere("c.firstSeen BETWEEN :start AND :end", {
        start: startDate,
        end: endDate,
      })
      .getCount();
  }

  /**
   * New contacts trend: count per period where firstSeen falls in that period.
   * Returns same shape as event repo trend: { period, newContacts }[].
   */
  async getNewContactsTrend(
    tenantId: string,
    startDate: Date,
    endDate: Date,
    granularity: "day" | "week" | "month" = "day",
  ): Promise<Array<{ period: Date; newContacts: number }>> {
    const trunc =
      granularity === "day" ? "day" : granularity === "week" ? "week" : "month";
    const rows = await this.repo.query(
      `
      SELECT DATE_TRUNC($4, c."firstSeen") AS period, COUNT(*)::int AS "newContacts"
      FROM contacts c
      WHERE c."tenantId" = $1 AND c."firstSeen" BETWEEN $2 AND $3
      GROUP BY DATE_TRUNC($4, c."firstSeen")
      ORDER BY period ASC
      `,
      [tenantId, startDate, endDate, trunc],
    );
    return rows.map((r: { period: Date; newContacts: number }) => ({
      period: r.period,
      newContacts:
        typeof r.newContacts === "number"
          ? r.newContacts
          : parseInt(String(r.newContacts), 10) || 0,
    }));
  }
}
