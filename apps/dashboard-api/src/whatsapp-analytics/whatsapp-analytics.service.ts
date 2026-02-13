import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { EventRepository, ContactRepository } from "@lib/database";

@Injectable()
export class WhatsappAnalyticsService {
  constructor(
    private readonly eventRepository: EventRepository,
    private readonly contactRepository: ContactRepository,
  ) {}

  async getStats(tenantId: string, startDate?: Date, endDate?: Date) {
    const end = endDate || new Date();
    const start =
      startDate || new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
    const eventStats = await this.eventRepository.getWhatsappStats(
      tenantId,
      start,
      end,
    );
    return {
      ...eventStats,
      // uniqueContacts and newContacts from events (in-period); do not overwrite with contact repo
    };
  }

  async getVolumeByHour(tenantId: string, startDate?: Date, endDate?: Date) {
    const end = endDate || new Date();
    const start =
      startDate || new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
    return this.eventRepository.getWhatsappVolumeByHour(tenantId, start, end);
  }

  async getHeatmap(tenantId: string, startDate?: Date, endDate?: Date) {
    const end = endDate || new Date();
    const start =
      startDate || new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
    return this.eventRepository.getWhatsappHeatmap(tenantId, start, end);
  }

  async getAgentPerformance(
    tenantId: string,
    startDate?: Date,
    endDate?: Date,
  ) {
    const end = endDate || new Date();
    const start =
      startDate || new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
    const results = await this.eventRepository.getWhatsappAgentPerformance(
      tenantId,
      start,
      end,
    );
    return results.map((r) => ({
      agentId: r.agent_id,
      chatCount: parseInt(r.chat_count, 10) || 0,
    }));
  }

  async getCountryBreakdown(
    tenantId: string,
    startDate?: Date,
    endDate?: Date,
  ) {
    const end = endDate || new Date();
    const start =
      startDate || new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
    const results = await this.eventRepository.getWhatsappCountryBreakdown(
      tenantId,
      start,
      end,
    );
    return results.map((r) => ({
      countryCode: r.country_code,
      count: parseInt(r.count, 10) || 0,
    }));
  }

  async getResponseTime(tenantId: string, startDate?: Date, endDate?: Date) {
    const end = endDate || new Date();
    const start =
      startDate || new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
    return this.eventRepository.getWhatsappResponseTime(tenantId, start, end);
  }

  async getFunnel(tenantId: string, startDate?: Date, endDate?: Date) {
    const end = endDate || new Date();
    const start =
      startDate || new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
    return this.eventRepository.getWhatsappFunnel(tenantId, start, end);
  }

  async getResolutionTimeStats(
    tenantId: string,
    startDate?: Date,
    endDate?: Date,
  ) {
    const end = endDate || new Date();
    const start =
      startDate || new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
    return this.eventRepository.getResolutionTimeStats(tenantId, start, end);
  }

  async getConversationLength(
    tenantId: string,
    startDate?: Date,
    endDate?: Date,
  ) {
    const end = endDate || new Date();
    const start =
      startDate || new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
    return this.eventRepository.getConversationLengthDistribution(
      tenantId,
      start,
      end,
    );
  }

  // =============================================================================
  // TREND METHODS
  // =============================================================================

  private calculateStartDate(
    granularity: "day" | "week" | "month",
    periods: number,
  ): Date {
    const now = new Date();
    switch (granularity) {
      case "day":
        return new Date(now.getTime() - periods * 24 * 60 * 60 * 1000);
      case "week":
        return new Date(now.getTime() - periods * 7 * 24 * 60 * 60 * 1000);
      case "month":
        const monthsAgo = new Date(now);
        monthsAgo.setMonth(monthsAgo.getMonth() - periods);
        return monthsAgo;
    }
  }

  private resolveTrendDateRange(
    granularity: "day" | "week" | "month",
    periods: number,
    startDateStr?: string,
    endDateStr?: string,
  ): { startDate: Date; endDate: Date } {
    if (startDateStr && endDateStr) {
      const startDate = new Date(startDateStr);
      const endDate = new Date(endDateStr);
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
      return { startDate, endDate };
    }
    const endDate = new Date();
    const startDate = this.calculateStartDate(granularity, periods);
    return { startDate, endDate };
  }

  /** Serialize period to ISO string and fill missing periods with zeros so charts have a full timeline. */
  private fillVolumeTrendGaps(
    data: { period: Date | string; received: number; sent: number }[],
    startDate: Date,
    endDate: Date,
    granularity: "day" | "week" | "month",
  ): { period: string; received: number; sent: number }[] {
    const toKey = (d: Date) => {
      const y = d.getUTCFullYear();
      const m = String(d.getUTCMonth() + 1).padStart(2, "0");
      const day = String(d.getUTCDate()).padStart(2, "0");
      if (granularity === "day") return `${y}-${m}-${day}`;
      if (granularity === "week") {
        const jan1 = new Date(Date.UTC(y, 0, 1));
        const weekNo = Math.ceil(
          (d.getTime() - jan1.getTime()) / (7 * 24 * 60 * 60 * 1000),
        );
        return `${y}-W${weekNo}`;
      }
      return `${y}-${m}`;
    };
    const map = new Map<string, { received: number; sent: number }>();
    for (const row of data) {
      const p =
        typeof row.period === "string" ? new Date(row.period) : row.period;
      const key = toKey(p);
      map.set(key, { received: row.received, sent: row.sent });
    }
    const out: { period: string; received: number; sent: number }[] = [];
    const curr = new Date(startDate);
    curr.setUTCHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setUTCHours(23, 59, 59, 999);
    while (curr <= end) {
      const key = toKey(curr);
      const row = map.get(key) ?? { received: 0, sent: 0 };
      out.push({
        period: curr.toISOString(),
        received: row.received,
        sent: row.sent,
      });
      if (granularity === "day") curr.setUTCDate(curr.getUTCDate() + 1);
      else if (granularity === "week") curr.setUTCDate(curr.getUTCDate() + 7);
      else curr.setUTCMonth(curr.getUTCMonth() + 1);
    }
    return out;
  }

  async getMessageVolumeTrend(
    tenantId: string,
    granularity: "day" | "week" | "month" = "day",
    periods: number = 30,
    startDateStr?: string,
    endDateStr?: string,
  ) {
    const { startDate, endDate } = this.resolveTrendDateRange(
      granularity,
      periods,
      startDateStr,
      endDateStr,
    );

    const raw = await this.eventRepository.getWhatsappMessageVolumeTrend(
      tenantId,
      startDate,
      endDate,
      granularity,
    );

    const data = this.fillVolumeTrendGaps(raw, startDate, endDate, granularity);

    const totalReceived = data.reduce((sum, d) => sum + d.received, 0);
    const totalSent = data.reduce((sum, d) => sum + d.sent, 0);

    return {
      data,
      summary: {
        totalReceived,
        totalSent,
        total: totalReceived + totalSent,
      },
      granularity,
      startDate,
      endDate,
    };
  }

  async getResponseTimeTrend(
    tenantId: string,
    granularity: "day" | "week" | "month" = "day",
    periods: number = 30,
    startDateStr?: string,
    endDateStr?: string,
  ) {
    const { startDate, endDate } = this.resolveTrendDateRange(
      granularity,
      periods,
      startDateStr,
      endDateStr,
    );

    const data = await this.eventRepository.getWhatsappResponseTimeTrend(
      tenantId,
      startDate,
      endDate,
      granularity,
    );

    // Calculate overall median from the data
    const allResponseTimes = data.filter(
      (d: { medianMinutes: number }) => d.medianMinutes > 0,
    );
    const overallMedian =
      allResponseTimes.length > 0
        ? allResponseTimes.reduce(
            (sum: number, d: { medianMinutes: number }) =>
              sum + d.medianMinutes,
            0,
          ) / allResponseTimes.length
        : 0;

    return {
      data,
      summary: {
        overallMedianMinutes: Math.round(overallMedian * 10) / 10,
        totalResponses: data.reduce(
          (sum: number, d: { responseCount: number }) => sum + d.responseCount,
          0,
        ),
        targetMinutes: 5, // SLA target
      },
      granularity,
      startDate,
      endDate,
    };
  }

  /** Fill read-rate trend gaps and ensure period is ISO string. */
  private fillReadRateTrendGaps(
    data: {
      period: Date | string;
      sent: number;
      readCount: number;
      readRate: number;
    }[],
    startDate: Date,
    endDate: Date,
    granularity: "day" | "week" | "month",
  ): { period: string; sent: number; readCount: number; readRate: number }[] {
    const toKey = (d: Date) => {
      const y = d.getUTCFullYear();
      const m = String(d.getUTCMonth() + 1).padStart(2, "0");
      const day = String(d.getUTCDate()).padStart(2, "0");
      if (granularity === "day") return `${y}-${m}-${day}`;
      if (granularity === "week") {
        const jan1 = new Date(Date.UTC(y, 0, 1));
        const weekNo = Math.ceil(
          (d.getTime() - jan1.getTime()) / (7 * 24 * 60 * 60 * 1000),
        );
        return `${y}-W${weekNo}`;
      }
      return `${y}-${m}`;
    };
    const map = new Map<
      string,
      { sent: number; readCount: number; readRate: number }
    >();
    for (const row of data) {
      const p =
        typeof row.period === "string" ? new Date(row.period) : row.period;
      map.set(toKey(p), {
        sent: row.sent,
        readCount: row.readCount,
        readRate: row.readRate,
      });
    }
    const out: {
      period: string;
      sent: number;
      readCount: number;
      readRate: number;
    }[] = [];
    const curr = new Date(startDate);
    curr.setUTCHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setUTCHours(23, 59, 59, 999);
    while (curr <= end) {
      const key = toKey(curr);
      const row = map.get(key) ?? { sent: 0, readCount: 0, readRate: 0 };
      out.push({ period: curr.toISOString(), ...row });
      if (granularity === "day") curr.setUTCDate(curr.getUTCDate() + 1);
      else if (granularity === "week") curr.setUTCDate(curr.getUTCDate() + 7);
      else curr.setUTCMonth(curr.getUTCMonth() + 1);
    }
    return out;
  }

  async getReadRateTrend(
    tenantId: string,
    granularity: "day" | "week" | "month" = "day",
    periods: number = 30,
    startDateStr?: string,
    endDateStr?: string,
  ) {
    const { startDate, endDate } = this.resolveTrendDateRange(
      granularity,
      periods,
      startDateStr,
      endDateStr,
    );

    const raw = await this.eventRepository.getWhatsappReadRateTrend(
      tenantId,
      startDate,
      endDate,
      granularity,
    );

    const data = this.fillReadRateTrendGaps(
      raw,
      startDate,
      endDate,
      granularity,
    );

    const totalSent = data.reduce((sum, d) => sum + d.sent, 0);
    const totalRead = data.reduce((sum, d) => sum + d.readCount, 0);

    return {
      data,
      summary: {
        totalSent,
        totalRead,
        overallReadRate:
          totalSent > 0 ? Math.round((totalRead / totalSent) * 1000) / 10 : 0,
      },
      granularity,
      startDate,
      endDate,
    };
  }

  /** Fill new-contacts trend gaps and ensure period is ISO string. */
  private fillNewContactsTrendGaps(
    data: { period: Date | string; newContacts: number }[],
    startDate: Date,
    endDate: Date,
    granularity: "day" | "week" | "month",
  ): { period: string; newContacts: number }[] {
    const toKey = (d: Date) => {
      const y = d.getUTCFullYear();
      const m = String(d.getUTCMonth() + 1).padStart(2, "0");
      const day = String(d.getUTCDate()).padStart(2, "0");
      if (granularity === "day") return `${y}-${m}-${day}`;
      if (granularity === "week") {
        const jan1 = new Date(Date.UTC(y, 0, 1));
        const weekNo = Math.ceil(
          (d.getTime() - jan1.getTime()) / (7 * 24 * 60 * 60 * 1000),
        );
        return `${y}-W${weekNo}`;
      }
      return `${y}-${m}`;
    };
    const map = new Map<string, number>();
    for (const row of data) {
      const p =
        typeof row.period === "string" ? new Date(row.period) : row.period;
      map.set(toKey(p), row.newContacts);
    }
    const out: { period: string; newContacts: number }[] = [];
    const curr = new Date(startDate);
    curr.setUTCHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setUTCHours(23, 59, 59, 999);
    while (curr <= end) {
      const key = toKey(curr);
      out.push({ period: curr.toISOString(), newContacts: map.get(key) ?? 0 });
      if (granularity === "day") curr.setUTCDate(curr.getUTCDate() + 1);
      else if (granularity === "week") curr.setUTCDate(curr.getUTCDate() + 7);
      else curr.setUTCMonth(curr.getUTCMonth() + 1);
    }
    return out;
  }

  async getNewContactsTrend(
    tenantId: string,
    granularity: "day" | "week" | "month" = "day",
    periods: number = 30,
    startDateStr?: string,
    endDateStr?: string,
  ) {
    const { startDate, endDate } = this.resolveTrendDateRange(
      granularity,
      periods,
      startDateStr,
      endDateStr,
    );

    const raw = await this.eventRepository.getNewContactsTrend(
      tenantId,
      startDate,
      endDate,
      granularity,
    );

    const data = this.fillNewContactsTrendGaps(
      raw,
      startDate,
      endDate,
      granularity,
    );

    const totalNewContacts = data.reduce((sum, d) => sum + d.newContacts, 0);

    // Get previous period for comparison
    const previousEndDate = startDate;
    const previousStartDate = this.calculateStartDate(granularity, periods * 2);
    const previousData = await this.eventRepository.getNewContactsTrend(
      tenantId,
      previousStartDate,
      previousEndDate,
      granularity,
    );
    const previousTotal = previousData.reduce(
      (sum: number, d: { newContacts: number }) => sum + d.newContacts,
      0,
    );

    const percentChange =
      previousTotal > 0
        ? ((totalNewContacts - previousTotal) / previousTotal) * 100
        : 0;

    return {
      data,
      summary: {
        totalNewContacts,
        previousTotal,
        percentChange: Math.round(percentChange * 10) / 10,
      },
      granularity,
      startDate,
      endDate,
    };
  }

  async getContacts(tenantId: string, page: number = 1, limit: number = 20) {
    const [{ data, total, page: p, limit: l }, messageCounts] =
      await Promise.all([
        this.contactRepository.getList(tenantId, page, limit),
        this.contactRepository.getMessageCountsByContact(tenantId),
      ]);
    return {
      data: data.map((c) => {
        const count = messageCounts[c.contactId] ?? c.messageCount;
        return {
          contact_id: c.contactId,
          name: c.name ?? null,
          first_seen:
            c.firstSeen instanceof Date
              ? c.firstSeen.toISOString()
              : c.firstSeen,
          last_seen:
            c.lastSeen instanceof Date ? c.lastSeen.toISOString() : c.lastSeen,
          message_count: Math.max(c.messageCount, count),
        };
      }),
      total,
      page: p,
      limit: l,
    };
  }
  async exportContacts(tenantId: string) {
    const [dbStream, messageCounts] = await Promise.all([
      this.contactRepository.getAllStream(tenantId),
      this.contactRepository.getMessageCountsByContact(tenantId),
    ]);

    const { stringify } = await import("csv-stringify");
    const stringifier = stringify({
      header: true,
      columns: [
        "Name",
        "Phone",
        "Message Count",
        "Date created",
        "Last Seen",
      ],
    });

    const pick = (row: Record<string, unknown>, ...keys: string[]) => {
      for (const k of keys) {
        const v = row[k];
        if (v !== undefined && v !== null) return v;
      }
      return undefined;
    };
    dbStream.on("data", (row: any) => {
      const name =
        (pick(row, "name", "c_name", "ContactEntity_name") as string) ?? "";
      const contactId =
        (pick(
          row,
          "contactId",
          "contactid",
          "c_contactId",
          "ContactEntity_contactId",
        ) as string) ?? "";
      const rowCount =
        (pick(
          row,
          "messageCount",
          "messagecount",
          "c_messageCount",
          "ContactEntity_messageCount",
        ) as number) ?? 0;
      const messageCount = contactId
        ? (messageCounts[contactId] ?? rowCount)
        : rowCount;
      const firstSeen = pick(
        row,
        "firstSeen",
        "firstseen",
        "c_firstSeen",
        "ContactEntity_firstSeen",
      );
      const lastSeen = pick(
        row,
        "lastSeen",
        "lastseen",
        "c_lastSeen",
        "ContactEntity_lastSeen",
      );
      const dateCreatedIso = firstSeen
        ? new Date(firstSeen as string | Date).toISOString()
        : "";
      const lastSeenIso = lastSeen
        ? new Date(lastSeen as string | Date).toISOString()
        : "";
      stringifier.write([
        name,
        contactId,
        messageCount,
        dateCreatedIso,
        lastSeenIso,
        dateCreatedIso,
      ]);
    });

    dbStream.on("end", () => {
      stringifier.end();
    });

    dbStream.on("error", (err) => {
      stringifier.emit("error", err);
    });

    return stringifier;
  }

  async importContacts(
    tenantId: string,
    buffer: Buffer,
    strategy: "first" | "last" | "reject" = "last",
  ) {
    const { parse } = await import("csv-parse/sync");
    const { normalizeContactIdDigits } = await import("@lib/database");

    const records = parse(buffer, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    const contactsMap = new Map<
      string,
      {
        contactId: string;
        name?: string;
        metadata?: Record<string, string>;
      }
    >();

    for (const row of records as Array<Record<string, string>>) {
      // Map columns flexibly
      const phone =
        row["Phone"] || row["phone"] || row["Contact ID"] || row["Mobile"];
      const name = row["Name"] || row["name"] || row["Full Name"];

      if (!phone) continue;

      const normalized = normalizeContactIdDigits(phone);
      if (!normalized) continue;

      const contactData = {
        contactId: normalized,
        name: name || undefined,
        metadata: {
          imported: "true",
          importDate: new Date().toISOString(),
        },
      };

      if (contactsMap.has(normalized)) {
        if (strategy === "reject") {
          throw new BadRequestException(
            `Duplicate contact found in import: ${phone} (normalized: ${normalized}). duplicates are not allowed with 'reject' strategy.`,
          );
        }
        if (strategy === "first") {
          // Keep existing, ignore new
          continue;
        }
        if (strategy === "last") {
          // Overwrite existing with new
          contactsMap.set(normalized, contactData);
        }
      } else {
        contactsMap.set(normalized, contactData);
      }
    }

    const contactsToUpsert = Array.from(contactsMap.values());

    if (contactsToUpsert.length > 0) {
      // Process in chunks of 500 to avoid query param limits
      const chunkSize = 500;
      for (let i = 0; i < contactsToUpsert.length; i += chunkSize) {
        await this.contactRepository.bulkUpsert(
          tenantId,
          contactsToUpsert.slice(i, i + chunkSize),
        );
      }
    }

    return {
      success: true,
      importedCount: contactsToUpsert.length,
    };
  }

  async deactivateContact(tenantId: string, contactId: string) {
    const contact = await this.contactRepository.deactivate(tenantId, contactId);
    if (!contact) {
      throw new NotFoundException("Contact not found");
    }
    return { success: true, contactId: contact.contactId };
  }
}
