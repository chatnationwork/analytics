import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, SelectQueryBuilder, Brackets, WhereExpressionBuilder } from "typeorm";
import { ContactEntity } from "../entities/contact.entity";
import { SegmentFilter, FilterCondition, FilterGroup } from "./segment-filter.types";

@Injectable()
export class SegmentationService {
  private readonly logger = new Logger(SegmentationService.name);

  // Base fields that are always available on ContactEntity
  private static readonly BASE_FIELDS = new Set([
     "contactId", "name", "email", "pin", "yearOfBirth", 
     "messageCount", "firstSeen", "lastSeen", "paymentStatus", "tags"
  ]);

  constructor(
    @InjectRepository(ContactEntity)
    private readonly contactRepo: Repository<ContactEntity>,
  ) {}

  /**
   * Resolve contacts matching the segmentation filter.
   * Always scoped to tenantId and active contacts.
   */
  async resolveContacts(
    tenantId: string,
    filter: SegmentFilter | null,
  ): Promise<ContactEntity[]> {
    const qb = this.buildQuery(tenantId, filter);
    return qb.getMany();
  }

  /**
   * Count contacts matching the filter.
   */
  async countContacts(
    tenantId: string,
    filter: SegmentFilter | null,
  ): Promise<number> {
    const qb = this.buildQuery(tenantId, filter);
    return qb.getCount();
  }

  /**
   * Build the TypeORM query for the filter.
   * Exposed so consumers can add their own selects/joins.
   */
  buildQuery(
    tenantId: string,
    filter: SegmentFilter | null,
  ): SelectQueryBuilder<ContactEntity> {
    const qb = this.contactRepo.createQueryBuilder("c");

    // Base scope: tenant + active + opted-in
    qb.where("c.tenantId = :tenantId", { tenantId })
      .andWhere("c.deactivatedAt IS NULL")
      .andWhere("c.optedIn = TRUE");

    if (!filter || !filter.conditions || filter.conditions.length === 0) {
      return qb;
    }

    this.applyGroup(qb, filter, "root");
    return qb;
  }

  private applyGroup(
    qb: WhereExpressionBuilder, 
    group: FilterGroup, 
    groupKey: string
  ): void {
    if (!group.conditions.length) return;

    // We use Brackets to isolate this group's logic
    const bracket = new Brackets((innerQb) => {
      let first = true;
      
      group.conditions.forEach((item, idx) => {
        const itemKey = `${groupKey}_${idx}`;
        
        // If it's a nested group
        if ('logic' in item) {
           const method = first ? 'where' : (group.logic === 'OR' ? 'orWhere' : 'andWhere');
           innerQb[method](new Brackets((nestedQb) => {
              this.applyGroup(nestedQb, item as FilterGroup, itemKey);
           }));
        } 
        // If it's a condition
        else {
           const condition = item as FilterCondition;
           const sql = this.buildConditionSql(condition, itemKey, innerQb);
           
           if (sql) {
             const method = first ? 'where' : (group.logic === 'OR' ? 'orWhere' : 'andWhere');
             innerQb[method](sql.query, sql.params);
           }
        }
        
        if (first) first = false;
      });
    });

    // Apply the bracket to the main query
    qb.andWhere(bracket);
  }

  private buildConditionSql(
    cond: FilterCondition,
    paramKey: string,
    qb: any // TypeORM WhereExpression
  ): { query: string; params: Record<string, unknown> } | null {
    const { field, operator, value } = cond;
    const params: Record<string, unknown> = {};
    params[paramKey] = value;

    // 1. JSONB Metadata Fields: metadata.role
    if (field.startsWith("metadata.")) {
      const jsonKey = field.replace("metadata.", "");
      return this.buildJsonbCondition(jsonKey, operator, value, paramKey);
    }

    // 2. Tags Logic
    if (field === "tags") {
      return this.buildTagsCondition(operator, value, paramKey);
    }

    // 3. Regular Columns
    // Only allow known safe columns to prevent SQL injection via field name
    if (!SegmentationService.BASE_FIELDS.has(field)) {
       this.logger.warn(`Ignoring unknown field: ${field}`);
       return null;
    }

    const col = `c.${field}`;
    
    switch (operator) {
      case "eq": return { query: `${col} = :${paramKey}`, params };
      case "neq": return { query: `${col} != :${paramKey}`, params };
      case "gt": return { query: `${col} > :${paramKey}`, params };
      case "gte": return { query: `${col} >= :${paramKey}`, params };
      case "lt": return { query: `${col} < :${paramKey}`, params };
      case "lte": return { query: `${col} <= :${paramKey}`, params };
      case "contains": 
        params[paramKey] = `%${value}%`;
        return { query: `${col} ILIKE :${paramKey}`, params };
      case "starts_with": 
        params[paramKey] = `${value}%`;
        return { query: `${col} ILIKE :${paramKey}`, params };
      case "ends_with": 
        params[paramKey] = `%${value}`;
        return { query: `${col} ILIKE :${paramKey}`, params };
      case "in": return { query: `${col} IN (:...${paramKey})`, params };
      case "not_in": return { query: `${col} NOT IN (:...${paramKey})`, params };
      case "is_null": return { query: `${col} IS NULL`, params: {} };
      case "is_not_null": return { query: `${col} IS NOT NULL`, params: {} };
      default:
        this.logger.warn(`Unknown operator: ${operator}`);
        return null;
    }
  }

  private buildJsonbCondition(
    key: string,
    operator: string,
    value: unknown,
    paramKey: string
  ): { query: string; params: Record<string, unknown> } | null {
    const accessor = `c.metadata->>'${key}'`;
    const params: Record<string, unknown> = {};

    switch (operator) {
      case "eq":
        params[paramKey] = value;
        return { query: `${accessor} = :${paramKey}`, params };
      case "neq":
        params[paramKey] = value;
        return { query: `${accessor} != :${paramKey}`, params };
      case "contains":
        params[paramKey] = value; // TypeORM handles escaping? No, ILIKE needs wrapper
        // Hand-crafting ILIKE for JSON text
        return { 
           query: `${accessor} ILIKE '%' || :${paramKey} || '%'`, 
           params: { [paramKey]: value } 
        };
      case "is_null":
        return { query: `${accessor} IS NULL`, params: {} };
      case "is_not_null":
        return { query: `${accessor} IS NOT NULL`, params: {} };
      default:
        return null;
    }
  }

  private buildTagsCondition(
    operator: string,
    value: unknown,
    paramKey: string
  ): { query: string; params: Record<string, unknown> } | null {
     const params: Record<string, unknown> = { [paramKey]: value };

     switch (operator) {
       case "contains": // check if array contains ONE item
         return { query: `:${paramKey} = ANY(c.tags)`, params };
       case "contains_any": // check overlap (PG && operator)
         return { query: `c.tags && :${paramKey}`, params };
       case "contains_all": // check superset (PG @> operator)
         return { query: `c.tags @> :${paramKey}`, params };
       default:
         return null;
     }
  }
}
