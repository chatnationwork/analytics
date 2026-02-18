import { Injectable, BadRequestException, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, DataSource } from "typeorm";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import { EosTicket } from "@lib/database";
import { EosTicketType } from "@lib/database";
import { EosEvent } from "@lib/database";
import { ContactEntity } from "@lib/database";
import { InitiatePurchaseDto } from "./dto/initiate-purchase.dto";
import { PaymentService } from "../billing/payment.service";
import { TriggerService } from "../campaigns/trigger.service";
import { CampaignTrigger } from "../campaigns/constants";

@Injectable()
export class EosTicketService {
  private readonly logger = new Logger(EosTicketService.name);

  constructor(
    @InjectRepository(EosTicket)
    private readonly ticketRepo: Repository<EosTicket>,
    @InjectRepository(EosTicketType)
    private readonly ticketTypeRepo: Repository<EosTicketType>,
    @InjectRepository(EosEvent)
    private readonly eventRepo: Repository<EosEvent>,
    @InjectRepository(ContactEntity)
    private readonly contactRepo: Repository<ContactEntity>,
    private readonly dataSource: DataSource,
    private readonly paymentService: PaymentService,
    private readonly triggerService: TriggerService,
    @InjectQueue("eos-hypecard-generation") private hypeCardQueue: Queue,
  ) {}

  async initiatePurchase(
    organizationId: string,
    dto: InitiatePurchaseDto,
  ): Promise<EosTicket> {
    return this.dataSource.transaction(async (manager) => {
      // 1. Validate Ticket Type & Quantity
      const ticketType = await manager.findOne(EosTicketType, {
        where: { id: dto.ticketTypeId },
        relations: ["event"],
        lock: { mode: "pessimistic_write" }, // Prevent overselling
      });

      if (!ticketType || !ticketType.isActive)
        throw new BadRequestException("Invalid or inactive ticket type");
      if (ticketType.event.organizationId !== organizationId)
        throw new BadRequestException("Organization mismatch");

      const sold = ticketType.quantitySold || 0;
      const total = ticketType.quantityTotal;
      if (total !== null && sold >= total) {
        throw new BadRequestException("Sold out");
      }

      // 2. Resolve Contact
      // Simplified: Find by phone or create. In real app, might need more robust contact resolution
      let contact = await manager.findOne(ContactEntity, {
        where: { tenantId: organizationId, contactId: dto.phone },
      });

      if (!contact) {
        contact = manager.create(ContactEntity, {
          tenantId: organizationId,
          contactId: dto.phone,
          name: dto.holderName,
          email: dto.holderEmail,
          firstSeen: new Date(),
          lastSeen: new Date(),
          // other required fields
        });
        contact = await manager.save(contact);
      }

      // 3. Create Pending Ticket
      // 3. Create Pending Ticket
      const ticket = new EosTicket();
      Object.assign(ticket, {
        ticketTypeId: ticketType.id,
        contactId: contact.id,
        holderName: dto.holderName || contact.name,
        holderEmail: dto.holderEmail || contact.email,
        holderPhone: dto.holderPhone || dto.phone,
        amountPaid: ticketType.price,
        ticketCode: `PENDING_${Date.now()}`,
        paymentStatus: "pending",
      });

      await manager.save(ticket); // Save to get ID

      // 4. Increment Sold Count (Optimistic reservation)
      ticketType.quantitySold += 1;
      await manager.save(ticketType);

      // 5. Initiate Payment
      if (ticketType.price > 0) {
        const paymentRes = await this.paymentService.stkPush({
          phone: dto.phone,
          amount: ticketType.price,
          reference: ticket.id,
        });
        ticket.paymentReference = paymentRes.CheckoutRequestID;
        await manager.save(ticket);
      } else {
        // Free ticket
        await this.fulfillTicket(ticket.id, manager);
      }

      return ticket;
    });
  }

  async processCallback(payload: any) {
    // Simplified callback processing
    const { CheckoutRequestID, ResultCode, MpesaReceiptNumber } = payload; // Adapt to actual M-Pesa payload structure

    if (ResultCode !== 0) {
      // Handle failure
      return;
    }

    const ticket = await this.ticketRepo.findOne({
      where: { paymentReference: CheckoutRequestID },
      relations: ["ticketType", "ticketType.event"],
    });

    if (!ticket) return;

    if (ticket.paymentStatus === "completed") return;

    // Fulfill
    ticket.paymentMetadata = payload;
    await this.fulfillTicket(ticket.id);
  }

  private async fulfillTicket(ticketId: string, externalManager?: any) {
    const manager = externalManager || this.dataSource.manager;
    const ticket = await manager.findOne(EosTicket, {
      where: { id: ticketId },
      relations: ["ticketType", "ticketType.event"],
    });

    if (!ticket) return;

    // 1. Generate Code (nanoid 8 chars - simplified here)
    ticket.ticketCode = Math.random()
      .toString(36)
      .substring(2, 10)
      .toUpperCase();
    ticket.paymentStatus = "completed";
    ticket.status = "valid";
    // Generate QR URL stub
    ticket.qrCodeUrl = `https://chart.googleapis.com/chart?cht=qr&chl=${ticket.ticketCode}&chs=180x180&choe=UTF-8&chld=L|2`;

    await manager.save(ticket);

    // 2. HypeCard
    if (ticket.ticketType.event.settings?.hype_card_on_reg) {
      await this.hypeCardQueue.add("generate", {
        ticketId: ticket.id,
        templateId: "default", // would need resolution logic
        inputData: {
          name: ticket.holderName,
          event: ticket.ticketType.event.name,
        },
      });
    }

    // 3. Trigger Campaign
    // TICKET_ISSUED trigger
    try {
      await this.triggerService.fire(CampaignTrigger.TICKET_ISSUED, {
        // String literal if enum not imported
        tenantId: ticket.ticketType.event.organizationId,
        contactId: ticket.contactId, // Pass UUID as per brief
        context: {
          // payload in brief, context in TriggerService
          ticketCode: ticket.ticketCode,
          qrCodeUrl: ticket.qrCodeUrl,
        },
      });
    } catch (e) {
      this.logger.error(`Failed to fire trigger: ${e.message}`);
    }
  }

  async getStatus(ticketId: string) {
    return this.ticketRepo.findOne({
      where: { id: ticketId },
      select: ["id", "paymentStatus", "status", "ticketCode", "qrCodeUrl"],
    });
  }
}
