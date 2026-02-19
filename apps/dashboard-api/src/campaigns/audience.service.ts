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
import { ContactEntity, SegmentationService, SegmentFilter as AudienceFilter } from "@lib/database";
import { WA_CONVERSATION_WINDOW_MS } from "./constants";

// Export for external consumers
export { AudienceFilter };

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

  constructor(
    @InjectRepository(ContactEntity)
    private readonly contactRepo: Repository<ContactEntity>,
    private readonly segmentationService: SegmentationService,
  ) {}

  /**
   * Resolve contacts matching the given audience filter.
   * Always excludes deactivated and opted-out contacts.
   */
  async resolveContacts(
    tenantId: string,
    filter: AudienceFilter | null,
  ): Promise<ContactEntity[]> {
    return this.segmentationService.resolveContacts(tenantId, filter);
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
    return this.segmentationService.countContacts(tenantId, filter);
  }

  /** Count contacts with window split (for audience preview). */
  async countContactsWithWindowSplit(
    tenantId: string,
    filter: AudienceFilter | null,
  ): Promise<AudienceSplitCount> {
    const windowCutoff = new Date(Date.now() - WA_CONVERSATION_WINDOW_MS);

    // Get total count using segmentation service
    const total = await this.countContacts(tenantId, filter);

    // Build specific query for in-window count
    const inWindowQb = this.segmentationService.buildQuery(tenantId, filter);
    inWindowQb.andWhere("c.lastSeen > :windowCutoff", { windowCutoff });
    const inWindow = await inWindowQb.getCount();

    return {
      total,
      inWindow,
      outOfWindow: total - inWindow,
    };
  }



}
