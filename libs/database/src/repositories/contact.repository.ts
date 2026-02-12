/**
 * Contact repository – upsert on message.received, list with pagination.
 */

import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { IsNull, Repository } from "typeorm";
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

  /** Find one contact by tenant and contact id (e.g. phone). */
  async findOne(
    tenantId: string,
    contactId: string,
  ): Promise<ContactEntity | null> {
    return this.repo.findOne({
      where: { tenantId, contactId },
    });
  }

  /**
   * Find or create a contact so the profile panel can always show/edit. Creates with firstSeen/lastSeen = now, messageCount = 0 if missing.
   */
  async findOneOrCreate(
    tenantId: string,
    contactId: string,
    name?: string | null,
  ): Promise<ContactEntity> {
    const existing = await this.repo.findOne({
      where: { tenantId, contactId },
    });
    if (existing) return existing;
    const now = new Date();
    const created = this.repo.create({
      tenantId,
      contactId,
      name: name ?? null,
      firstSeen: now,
      lastSeen: now,
      messageCount: 0,
    });
    return this.repo.save(created);
  }

  /**
   * Update contact profile fields (name, pin, yearOfBirth, email, metadata). Does not touch firstSeen/lastSeen/messageCount.
   */
  async updateProfile(
    tenantId: string,
    contactId: string,
    data: Partial<
      Pick<ContactEntity, "name" | "pin" | "yearOfBirth" | "email" | "metadata">
    >,
  ): Promise<ContactEntity | null> {
    await this.repo.update({ tenantId, contactId }, data);
    return this.findOne(tenantId, contactId);
  }

  /**
   * Search contacts by name or phone (contactId).
   */
  async search(
    tenantId: string,
    query: string,
    limit: number = 20,
  ): Promise<ContactEntity[]> {
    const qb = this.repo.createQueryBuilder("c");
    qb.where("c.tenantId = :tenantId", { tenantId })
      .andWhere("c.deactivatedAt IS NULL");

    if (query && query.trim()) {
      const q = `%${query.trim()}%`;
      qb.andWhere(
        "(c.name ILIKE :q OR c.contactId ILIKE :q)",
        { q },
      );
    }

    return qb
      .orderBy("c.lastSeen", "DESC")
      .take(limit)
      .getMany();
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
      where: { tenantId, deactivatedAt: IsNull() },
      order: { lastSeen: "DESC" },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, total, page, limit };
  }

  /** Total contact count for a tenant (active only: not deactivated). */
  async getTotalCount(tenantId: string): Promise<number> {
    return this.repo.count({
      where: { tenantId, deactivatedAt: IsNull() },
    });
  }

  /**
   * Deactivate a contact (soft). Excludes from list and export. Requires contacts.deactivate permission.
   */
  async deactivate(tenantId: string, contactId: string): Promise<ContactEntity | null> {
    await this.repo.update(
      { tenantId, contactId },
      { deactivatedAt: new Date() },
    );
    return this.findOne(tenantId, contactId);
  }

  /**
   * Actual message counts per contact from the messages table.
   * Use this to display correct counts when contact.messageCount is stale (e.g. contacts created via import or agent inbox).
   */
  async getMessageCountsByContact(
    tenantId: string,
  ): Promise<Record<string, number>> {
    const rows = await this.repo.manager.query(
      `SELECT "contactId", COUNT(*)::int AS cnt FROM messages WHERE "tenantId" = $1 GROUP BY "contactId"`,
      [tenantId],
    );
    return Object.fromEntries(
      (rows as Array<{ contactId: string; cnt: number }>).map((r) => [
        r.contactId,
        Number(r.cnt) || 0,
      ]),
    );
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
      .andWhere("c.deactivatedAt IS NULL")
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
      WHERE c."tenantId" = $1 AND c."firstSeen" BETWEEN $2 AND $3 AND c."deactivatedAt" IS NULL
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

  /**
   * Get a stream of all contacts for a tenant.
   * Useful for large exports. Uses explicit select with aliases so stream row keys are predictable (name, contactId, messageCount, firstSeen, lastSeen).
   */
  async getAllStream(tenantId: string) {
    return this.repo
      .createQueryBuilder("c")
      .select([
        "c.name AS name",
        "c.contactId AS contactId",
        "c.messageCount AS messageCount",
        "c.firstSeen AS firstSeen",
        "c.lastSeen AS lastSeen",
      ])
      .where("c.tenantId = :tenantId", { tenantId })
      .andWhere("c.deactivatedAt IS NULL")
      .orderBy("c.lastSeen", "DESC")
      .stream();
  }

  /**
   * Bulk upsert contacts.
   * Updates name/metadata if exists, creates if new.
   * Does NOT reset messageCount or firstSeen for existing.
   */
  async bulkUpsert(
    tenantId: string,
    contacts: Array<{
      contactId: string;
      name?: string | null;
      metadata?: Record<string, string>;
    }>,
  ) {
    if (contacts.length === 0) return;

    // TypeORM upsert is efficient
    // We map input to entity shape
    const entities = contacts.map((c) => {
      return this.repo.create({
        tenantId,
        contactId: c.contactId,
        name: c.name || undefined, // undefined keeps existing value in some partial update contexts, but for upsert we need values
        // For upsert, we need to be careful not to overwrite firstSeen if it exists
        // But TypeORM upsert overwrite options are limited
        // A better approach for "update only if exists, else create" in bulk is tricky with pure upsert without overwriting everything
        // However, standard upsert overwrites columns.
        // We want to PRESERVE firstSeen/messageCount if existing
        // So we might need to do: INSERT ... ON CONFLICT (...) DO UPDATE SET name = EXCLUDED.name ...
      });
    });

    // Custom query builder for precise control over ON CONFLICT
    await this.repo
      .createQueryBuilder()
      .insert()
      .into(ContactEntity)
      .values(
        contacts.map((c) => ({
          tenantId,
          contactId: c.contactId,
          name: c.name || null,
          metadata: c.metadata || null,
          firstSeen: new Date(), // Used only if new
          lastSeen: new Date(),
          messageCount: 0, // Used only if new
        })),
      )
      .orUpdate(["name", "metadata", "lastSeen"], ["tenantId", "contactId"])
      .execute();
  }
}
