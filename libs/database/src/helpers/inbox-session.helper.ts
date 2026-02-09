/**
 * Shared helper for inbox session creation.
 * Used by both dashboard-api (InboxService) and processor (EventProcessorService).
 * Ensures consistent normalization and dedup across all session creation paths.
 */

import { Repository, In } from "typeorm";
import {
  InboxSessionEntity,
  SessionStatus,
  TeamEntity,
} from "../entities";
import { normalizeContactIdDigits } from "../utils/canonical-contact-id";

export interface GetOrCreateSessionOptions {
  contactName?: string;
  channel?: string;
  context?: Record<string, unknown>;
}

export class InboxSessionHelper {
  constructor(
    private readonly sessionRepo: Repository<InboxSessionEntity>,
    private readonly teamRepo: Repository<TeamEntity>,
  ) {}

  /**
   * Gets or creates an inbox session for a contact.
   * - Normalizes contactId to digits-only
   * - Reuses existing ASSIGNED/UNASSIGNED session
   * - Falls back to any session created in last 60s (handles race condition)
   * - If creating NEW: automatically assigns Default Team (if found) so it appears in queue.
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

    // Creating NEW session: find Default Team for this tenant
    const defaultTeam = await this.teamRepo.findOne({
      where: { tenantId, isDefault: true, isActive: true },
    });

    const newSession = this.sessionRepo.create({
      tenantId,
      contactId: normalizedContactId,
      contactName,
      channel,
      status: SessionStatus.UNASSIGNED,
      assignedTeamId: defaultTeam?.id || undefined, // Auto-assign default team
      context,
    });

    return this.sessionRepo.save(newSession);
  }

  /**
   * Gets an existing inbox session for a contact without creating one.
   * Used by message sync paths to only add messages when the contact has already
   * been handed over (session created via handover endpoint).
   * Returns null if no ASSIGNED/UNASSIGNED session exists.
   */
  async getExistingSession(
    tenantId: string,
    contactId: string,
  ): Promise<InboxSessionEntity | null> {
    const normalizedContactId = normalizeContactIdDigits(contactId);
    if (!normalizedContactId) return null;

    return this.sessionRepo.findOne({
      where: {
        tenantId,
        contactId: normalizedContactId,
        status: In([SessionStatus.ASSIGNED, SessionStatus.UNASSIGNED]),
      },
      order: { lastMessageAt: "DESC" },
    });
  }
}
