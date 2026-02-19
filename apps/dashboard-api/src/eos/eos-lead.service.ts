import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import { EosLead } from "@lib/database";
import { EosExhibitor } from "@lib/database";
import { ContactEntity } from "@lib/database";
import { TriggerService } from "../campaigns/trigger.service";
import { CampaignTrigger } from "../campaigns/constants";

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

    if (!lead.exhibitor.contactId) {
      this.logger.warn(
        `Exhibitor ${lead.exhibitor.id} has no linked contact, cannot send hot lead alert`,
      );
      return;
    }

    try {
      await this.triggerService.fire(CampaignTrigger.HOT_LEAD_CAPTURED, {
        tenantId: lead.exhibitor.organizationId,
        contactId: lead.exhibitor.contactId,
        context: {
          leadName: lead.contact?.name || "Unknown Lead",
          leadPhone: lead.contact?.contactId,
          aiIntent: lead.aiIntent,
          interestLevel: lead.interestLevel,
        },
      });
      this.logger.log(`Hot lead alert sent for Lead ${lead.id}`);
    } catch (e) {
      this.logger.error(`Failed to send hot lead alert: ${e.message}`);
    }
  }

  async listLeads(exhibitorId: string) {
    return this.leadRepo.find({
      where: { exhibitorId },
      relations: ["contact"],
    });
  }
}
