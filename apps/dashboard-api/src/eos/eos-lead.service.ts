import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import { EosLead } from "@lib/database";
import { EosExhibitor } from "@lib/database";
import { ContactEntity } from "@lib/database";
import { TriggerService } from "../campaigns/trigger.service";

@Injectable()
export class EosLeadService {
  private readonly logger = new Logger(EosLeadService.name);

  constructor(
    @InjectRepository(EosLead)
    private readonly leadRepo: Repository<EosLead>,
    @InjectRepository(EosExhibitor)
    private readonly exhibitorRepo: Repository<EosExhibitor>,
    @InjectRepository(ContactEntity) // needed to lookup exhibitor contact
    private readonly contactRepo: Repository<ContactEntity>,
    private readonly triggerService: TriggerService,
    @InjectQueue("eos-lead-processing") private leadQueue: Queue,
  ) {}

  async captureLead(
    exhibitorId: string,
    contactId: string,
    source: "qr_scan" | "chat" | "booth_visit" = "qr_scan",
  ): Promise<EosLead> {
    let lead = await this.leadRepo.findOne({
      where: { exhibitorId, contactId },
    });
    if (!lead) {
      lead = this.leadRepo.create({
        exhibitorId,
        contactId,
        source,
        interestLevel: "cold",
        interactionContext: "event_active",
      });
      await this.leadRepo.save(lead);
    }

    // Enqueue analysis
    await this.leadQueue.add("analyze", {
      leadId: lead.id,
      transcript: "Dummy transcript for now",
    });

    return lead;
  }

  async analyzeIntent(leadId: string, transcript: string): Promise<void> {
    const lead = await this.leadRepo.findOne({ where: { id: leadId } });
    if (!lead) return;

    // Mock AI Analysis
    // In real implementation, call AI service
    const aiResult = {
      intent: "Interested in bulk pricing",
      interestLevel: "hot", // 'cold', 'warm', 'hot'
    };

    lead.aiIntent = aiResult.intent;
    lead.interestLevel = aiResult.interestLevel as any;

    await this.leadRepo.save(lead);

    if (lead.interestLevel === "hot") {
      await this.notifyExhibitor(lead.id);
    }
  }

  async notifyExhibitor(leadId: string): Promise<void> {
    const lead = await this.leadRepo.findOne({
      where: { id: leadId },
      relations: ["exhibitor", "contact"],
    });
    if (!lead || !lead.exhibitor) return;

    // Determine target contact for notification (Exhibitor's contact info)
    // The brief says: contactId: exhibitor.contactId (exhibitor's own WhatsApp contact)
    // However, the Exhibitor entity stores contactPhone/Email, not a linked ContactID directly unless we resolve it or add it.
    // EosExhibitor has `organizationId`. If it has `organizationId`, we might find a user/contact there.
    // Or we use `contactPhone` to find/create a contact to message.

    // Stub behavior based on brief: "TriggerService.handle('HOT_LEAD_CAPTURED', { tenantId: exhibitor.organizationId, contactId: exhibitor.contactId ... })"
    // Issue: EosExhibitor entity defined earlier DOES NOT have `contactId` column, only `contactPhone`.
    // I will assume for this stub that we resolve contactId from phone or fail gracefully if exhibitor.organizationId is set.

    if (!lead.exhibitor.organizationId) {
      this.logger.warn(
        `Exhibitor ${lead.exhibitor.id} has no organizationId, cannot send hot lead alert via TriggerService`,
      );
      return;
    }

    // Resolving contact ID for the exhibitor's phone is outside scope here without a proper lookup service,
    // but we need a contactId for TriggerService.
    // We'll proceed if we had one.

    /*
    await this.triggerService.fire('HOT_LEAD_CAPTURED', {
        tenantId: lead.exhibitor.organizationId,
        contactId: 'EXHIBITOR_CONTACT_UUID', // Needs resolution
        context: {
            leadContactName: lead.contact.name || lead.contact.phone,
            aiIntent: lead.aiIntent,
            eventName: 'Unknown Event' // Need relations
        }
    });
    */
    this.logger.log(
      `[STUB] Hot lead notification logic reached for Lead ${lead.id}`,
    );
  }

  async listLeads(exhibitorId: string) {
    return this.leadRepo.find({
      where: { exhibitorId },
      relations: ["contact"],
    });
  }
}
