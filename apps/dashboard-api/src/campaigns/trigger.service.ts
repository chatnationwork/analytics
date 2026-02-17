/**
 * TriggerService -- handles predefined event triggers that activate campaigns.
 *
 * Modules call fire() when an event occurs (e.g. ticket.purchased).
 * The service looks up active campaigns with matching triggerType
 * and enqueues them for the relevant contact(s).
 */

import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { CampaignEntity, CampaignStatus, ContactEntity } from "@lib/database";
import { ContactRepository } from "@lib/database";
import { CampaignOrchestratorService } from "./campaign-orchestrator.service";
import { CampaignTrigger } from "./constants";

export interface TriggerPayload {
  tenantId: string;
  /** Contact phone/ID (contactId field). Used to look up the contact UUID. */
  contactId: string;
  /** Optional extra context for template variable substitution. */
  context?: Record<string, unknown>;
}

@Injectable()
export class TriggerService {
  private readonly logger = new Logger(TriggerService.name);

  constructor(
    @InjectRepository(CampaignEntity)
    private readonly campaignRepo: Repository<CampaignEntity>,
    private readonly contactRepository: ContactRepository,
    private readonly orchestrator: CampaignOrchestratorService,
  ) {}

  /**
   * Fire a predefined trigger. Looks up campaigns listening for this trigger
   * and enqueues message sends for the specified contact.
   */
  async fire(trigger: CampaignTrigger, payload: TriggerPayload): Promise<void> {
    const { tenantId, contactId } = payload;

    // Find active campaigns with this trigger type
    const campaigns = await this.campaignRepo.find({
      where: {
        tenantId,
        triggerType: trigger,
        status: CampaignStatus.RUNNING,
      },
    });

    if (campaigns.length === 0) return;

    // Resolve the contact UUID from phone/contactId
    const contact = await this.contactRepository.findOne(tenantId, contactId);
    if (!contact) {
      this.logger.warn(
        `Trigger ${trigger}: contact ${contactId} not found for tenant ${tenantId}`,
      );
      return;
    }

    // Check opt-in
    if (!contact.optedIn || contact.deactivatedAt) {
      this.logger.debug(
        `Trigger ${trigger}: contact ${contactId} is opted out or deactivated, skipping`,
      );
      return;
    }

    for (const campaign of campaigns) {
      try {
        // Optional: match triggerConfig (e.g. specific eventId)
        if (campaign.triggerConfig && !this.matchesTriggerConfig(campaign.triggerConfig, payload.context)) {
          continue;
        }

        await this.orchestrator.executeForContact(
          tenantId,
          campaign.id,
          contact.id,
          contact.contactId,
        );

        this.logger.log(
          `Trigger ${trigger}: sent campaign ${campaign.id} to contact ${contactId}`,
        );
      } catch (error: unknown) {
        const errMsg =
          error instanceof Error ? error.message : String(error);
        this.logger.error(
          `Trigger ${trigger}: failed to send campaign ${campaign.id}: ${errMsg}`,
        );
      }
    }
  }

  /**
   * Check if the trigger context matches the campaign's triggerConfig.
   * Simple key-value equality check on all keys in triggerConfig.
   */
  private matchesTriggerConfig(
    config: Record<string, unknown>,
    context?: Record<string, unknown>,
  ): boolean {
    if (!context) return false;

    for (const [key, value] of Object.entries(config)) {
      if (context[key] !== value) return false;
    }

    return true;
  }
}
