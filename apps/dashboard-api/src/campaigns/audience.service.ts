/**
 * AudienceService -- translates audience filter DSL into TypeORM queries
 * against the contacts table. Always scoped to tenantId, excludes deactivated
 * and opted-out contacts.
 *
 * Supports splitting contacts into "in-window" (customer-initiated conversation
 * still open, free to message) and "out-of-window" (business-initiated, counts
 * against 24h tier limit) based on contacts.lastSeen.
 */

import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, SelectQueryBuilder } from "typeorm";
import { ContactEntity } from "@lib/database";
import { WA_CONVERSATION_WINDOW_MS } from "./constants";

export interface FilterCondition {
  field: string;
  operator: string;
  value: unknown;
}

export interface AudienceFilter {
  conditions: FilterCondition[];
  logic: "AND" | "OR";
}

/** Audience split by WhatsApp 24h conversation window status. */
export interface AudienceSplit {
  /** Contacts who messaged within the last 24h (free to reply, no template needed). */
  inWindow: ContactEntity[];
  /** Contacts outside the 24h window or never messaged (business-initiated, costs a tier slot). */
  outOfWindow: ContactEntity[];
}

/** Count-only version of the audience split (for preview). */
export interface AudienceSplitCount {
  total: number;
  inWindow: number;
  outOfWindow: number;
}

@Injectable()
export class AudienceService {
  private readonly logger = new Logger(AudienceService.name);

  /** Fields that can be filtered on directly (prevents SQL injection via field name). */
  private static readonly ALLOWED_FIELDS = new Set([
    "name",
    "email",
    "contactId",
    "pin",
    "yearOfBirth",
    "messageCount",
    "firstSeen",
    "lastSeen",
    "paymentStatus",
    "tags",
  ]);

  constructor(
    @InjectRepository(ContactEntity)
    private readonly contactRepo: Repository<ContactEntity>,
  ) {}

  /**
   * Resolve contacts matching the given audience filter.
   * Always excludes deactivated and opted-out contacts.
   */
  async resolveContacts(
    tenantId: string,
    filter: AudienceFilter | null,
  ): Promise<ContactEntity[]> {
    const qb = this.buildQuery(tenantId, filter);
    return qb.getMany();
  }

  /**
   * Resolve contacts split by 24h conversation window.
   * In-window contacts (lastSeen within 24h) are free to message.
   * Out-of-window contacts require templates and count against the tier.
   */
  async resolveContactsWithWindowSplit(
    tenantId: string,
    filter: AudienceFilter | null,
  ): Promise<AudienceSplit> {
    const allContacts = await this.resolveContacts(tenantId, filter);
    const windowCutoff = new Date(Date.now() - WA_CONVERSATION_WINDOW_MS);

    const inWindow: ContactEntity[] = [];
    const outOfWindow: ContactEntity[] = [];

    for (const contact of allContacts) {
      if (contact.lastSeen && contact.lastSeen > windowCutoff) {
        inWindow.push(contact);
      } else {
        outOfWindow.push(contact);
      }
    }

    return { inWindow, outOfWindow };
  }

  /** Count contacts matching the filter without loading them. */
  async countContacts(
    tenantId: string,
    filter: AudienceFilter | null,
  ): Promise<number> {
    const qb = this.buildQuery(tenantId, filter);
    return qb.getCount();
  }

  /** Count contacts with window split (for audience preview). */
  async countContactsWithWindowSplit(
    tenantId: string,
    filter: AudienceFilter | null,
  ): Promise<AudienceSplitCount> {
    const windowCutoff = new Date(Date.now() - WA_CONVERSATION_WINDOW_MS);

    const baseQb = this.buildQuery(tenantId, filter);
    const total = await baseQb.getCount();

    const inWindowQb = this.buildQuery(tenantId, filter);
    inWindowQb.andWhere("c.lastSeen > :windowCutoff", { windowCutoff });
    const inWindow = await inWindowQb.getCount();

    return {
      total,
      inWindow,
      outOfWindow: total - inWindow,
    };
  }

  private buildQuery(
    tenantId: string,
    filter: AudienceFilter | null,
  ): SelectQueryBuilder<ContactEntity> {
    const qb = this.contactRepo.createQueryBuilder("c");

    // Always scope to tenant, exclude deactivated and opted-out
    qb.where("c.tenantId = :tenantId", { tenantId })
      .andWhere("c.deactivatedAt IS NULL")
      .andWhere("c.optedIn = TRUE");

    if (!filter || !filter.conditions || filter.conditions.length === 0) {
      return qb;
    }

    const clauses: string[] = [];
    const params: Record<string, unknown> = {};

    for (let i = 0; i < filter.conditions.length; i++) {
      const cond = filter.conditions[i];
      const clause = this.buildCondition(cond, i, params);
      if (clause) clauses.push(clause);
    }

    if (clauses.length > 0) {
      const joiner = filter.logic === "OR" ? " OR " : " AND ";
      const combined = clauses.map((c) => `(${c})`).join(joiner);
      qb.andWhere(`(${combined})`, params);
    }

    return qb;
  }

  private buildCondition(
    cond: FilterCondition,
    index: number,
    params: Record<string, unknown>,
  ): string | null {
    const { field, operator, value } = cond;
    const paramKey = `p${index}`;

    // Handle metadata.* fields (JSONB)
    if (field.startsWith("metadata.")) {
      const jsonKey = field.slice("metadata.".length);
      params[`${paramKey}_key`] = jsonKey;
      params[paramKey] = value;
      return this.buildJsonbCondition(jsonKey, operator, paramKey);
    }

    // Handle tags (array) specially
    if (field === "tags") {
      return this.buildTagsCondition(operator, value, paramKey, params);
    }

    // Validate field name
    if (!AudienceService.ALLOWED_FIELDS.has(field)) {
      this.logger.warn(`Ignoring unknown filter field: ${field}`);
      return null;
    }

    const col = `c.${field}`;
    params[paramKey] = value;

    switch (operator) {
      case "eq":
        return `${col} = :${paramKey}`;
      case "neq":
        return `${col} != :${paramKey}`;
      case "gt":
        return `${col} > :${paramKey}`;
      case "gte":
        return `${col} >= :${paramKey}`;
      case "lt":
        return `${col} < :${paramKey}`;
      case "lte":
        return `${col} <= :${paramKey}`;
      case "contains":
        params[paramKey] = `%${value}%`;
        return `${col} ILIKE :${paramKey}`;
      case "in":
        return `${col} IN (:...${paramKey})`;
      case "not_in":
        return `${col} NOT IN (:...${paramKey})`;
      case "is_null":
        return `${col} IS NULL`;
      case "is_not_null":
        return `${col} IS NOT NULL`;
      default:
        this.logger.warn(`Ignoring unknown operator: ${operator}`);
        return null;
    }
  }

  private buildTagsCondition(
    operator: string,
    value: unknown,
    paramKey: string,
    params: Record<string, unknown>,
  ): string | null {
    switch (operator) {
      case "contains": {
        // Check if tags array contains a specific tag
        params[paramKey] = value;
        return `:${paramKey} = ANY(c.tags)`;
      }
      case "contains_any": {
        // Check if tags array overlaps with given array
        params[paramKey] = value;
        return `c.tags && :${paramKey}`;
      }
      case "contains_all": {
        // Check if tags array contains all given tags
        params[paramKey] = value;
        return `c.tags @> :${paramKey}`;
      }
      default:
        this.logger.warn(`Ignoring unknown tags operator: ${operator}`);
        return null;
    }
  }

  private buildJsonbCondition(
    jsonKey: string,
    operator: string,
    paramKey: string,
  ): string | null {
    const accessor = `c.metadata->>'${jsonKey}'`;

    switch (operator) {
      case "eq":
        return `${accessor} = :${paramKey}`;
      case "neq":
        return `${accessor} != :${paramKey}`;
      case "contains":
        return `${accessor} ILIKE '%' || :${paramKey} || '%'`;
      default:
        this.logger.warn(
          `Ignoring unknown metadata operator: ${operator}`,
        );
        return null;
    }
  }
}
