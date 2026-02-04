/**
 * Shared helper for inbox session creation.
 * Used by both dashboard-api (InboxService) and processor (EventProcessorService).
 * Ensures consistent normalization and dedup across all session creation paths.
 */

import { Repository, In } from "typeorm";
import {
  InboxSessionEntity,
  SessionStatus,
} from "../entities/inbox-session.entity";
import { normalizeContactIdDigits } from "../utils/canonical-contact-id";

export interface GetOrCreateSessionOptions {
  contactName?: string;
  channel?: string;
  context?: Record<string, unknown>;
}

export class InboxSessionHelper {
  constructor(private readonly sessionRepo: Repository<InboxSessionEntity>) {}

  /**
   * Gets or creates an inbox session for a contact.
   * - Normalizes contactId to digits-only
   * - Reuses existing ASSIGNED/UNASSIGNED session
   * - Falls back to any session created in last 60s (handles race condition)
   * @throws Error if contactId normalizes to empty (no digits)
   */
  async getOrCreateSession(
    tenantId: string,
    contactId: string,
    options?: GetOrCreateSessionOptions,
  ): Promise<InboxSessionEntity> {
    const normalizedContactId = normalizeContactIdDigits(contactId);
    if (!normalizedContactId) {
      throw new Error("contactId must contain at least one digit");
    }

    const contactName = options?.contactName;
    const channel = options?.channel ?? "whatsapp";
    const context = options?.context;

    // Reuse existing pending session (assigned or unassigned)
    let session = await this.sessionRepo.findOne({
      where: {
        tenantId,
        contactId: normalizedContactId,
        status: In([SessionStatus.ASSIGNED, SessionStatus.UNASSIGNED]),
      },
      order: { lastMessageAt: "DESC" },
    });

    if (session) {
      if (contactName && !session.contactName) {
        await this.sessionRepo.update(session.id, { contactName });
        session.contactName = contactName;
      }
      return session;
    }

    // Dedup race: reuse a session created in the last 60s for this contact (any status)
    const recentCutoff = new Date(Date.now() - 60 * 1000);
    session = await this.sessionRepo.findOne({
      where: {
        tenantId,
        contactId: normalizedContactId,
      },
      order: { createdAt: "DESC" },
    });
    if (session && session.createdAt >= recentCutoff) {
      if (contactName && !session.contactName) {
        await this.sessionRepo.update(session.id, { contactName });
        session.contactName = contactName;
      }
      return session;
    }

    const newSession = this.sessionRepo.create({
      tenantId,
      contactId: normalizedContactId,
      contactName,
      channel,
      status: SessionStatus.UNASSIGNED,
      context,
    });

    return this.sessionRepo.save(newSession);
  }
}
