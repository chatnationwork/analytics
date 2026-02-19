import {
  Injectable,
  BadRequestException,
  Logger,
  OnModuleInit,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, DataSource } from "typeorm";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import { EosTicket, Payment } from "@lib/database";
import { EosTicketType } from "@lib/database";
import { EosEvent } from "@lib/database";
import { ContactEntity } from "@lib/database";
import { InitiatePurchaseDto } from "./dto/initiate-purchase.dto";
import { TriggerService } from "../campaigns/trigger.service";
import { CampaignTrigger } from "../campaigns/constants";
import { MpesaService } from "../billing/mpesa.service";
import {
  PaymentCallbackService,
  PaymentFulfilledHandler,
} from "../billing/payment-callback.service";
import { nanoid } from "nanoid";
import * as QRCode from "qrcode";

@Injectable()
export class EosTicketService implements OnModuleInit, PaymentFulfilledHandler {
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
    private readonly mpesaService: MpesaService,
    private readonly paymentCallbackService: PaymentCallbackService,
    private readonly triggerService: TriggerService,
    @InjectQueue("eos-hypecard-generation") private hypeCardQueue: Queue,
  ) {}

  onModuleInit() {
    this.paymentCallbackService.register("eos_ticket", this);
    this.logger.log("Registered 'eos_ticket' payment handler");
  }

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
        });
        contact = await manager.save(contact);
      }

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
        status: "reserved", // Changed from undefined/pending to reserved
      });

      await manager.save(ticket); // Save to get ID

      // 4. Increment Sold Count (Optimistic reservation)
      ticketType.quantitySold += 1;
      await manager.save(ticketType);

      // 5. Initiate Payment
      if (ticketType.price > 0) {
        const payment = await this.mpesaService.initiateStkPush({
          organizationId,
          contactId: contact.id,
          payableType: "eos_ticket",
          payableId: ticket.id,
          phone: dto.phone,
          amount: ticketType.price,
          currency: "KES",
          description: `Ticket for ${ticketType.event.name}`,
        });

        // Store payment interaction reference
        ticket.paymentReference = payment.checkoutRequestId;
        await manager.save(ticket);
      } else {
        // Free ticket
        await this.fulfillTicket(ticket.id, manager);
      }

      // Warn buyer: reservation expires in 30 minutes if not paid
      return Object.assign(ticket, {
        reservationExpiresAt: new Date(
          ticket.createdAt.getTime() + 30 * 60 * 1000,
        ),
        reservationWarning:
          "Your ticket is reserved for 30 minutes. Please complete payment to confirm.",
      });
    });
  }

  /**
   * Called by PaymentCallbackService when payment is completed
   */
  async onPaymentFulfilled(payment: Payment): Promise<void> {
    if (payment.payableType !== "eos_ticket") return;
    this.logger.log(
      `Fulfilling ticket ${payment.payableId} for payment ${payment.id}`,
    );

    // Pass the mpesa receipt as metadata if needed
    await this.fulfillTicket(
      payment.payableId,
      undefined,
      payment.mpesaReceiptNumber,
    );
  }

  private async fulfillTicket(
    ticketId: string,
    externalManager?: any,
    receiptNumber?: string | null,
  ) {
    const manager = externalManager || this.dataSource.manager;
    const ticket = await manager.findOne(EosTicket, {
      where: { id: ticketId },
      relations: ["ticketType", "ticketType.event"],
    });

    if (!ticket) {
      this.logger.error(`Ticket ${ticketId} not found for fulfillment`);
      return;
    }

    if (ticket.status === "valid" || ticket.paymentStatus === "completed") {
      this.logger.warn(`Ticket ${ticketId} already fulfilled`);
      return;
    }

    // 1. Generate unique ticket code
    let ticketCode = "";
    let isUnique = false;
    // Safety break to prevent infinite loops (unlikely with 8 chars/base64 but good practice)
    let attempts = 0;

    while (!isUnique && attempts < 5) {
      ticketCode = nanoid(8).toUpperCase();
      const existing = await this.ticketRepo.findOne({ where: { ticketCode } });
      if (!existing) isUnique = true;
      attempts++;
    }

    if (!isUnique) {
      throw new Error("Failed to generate unique ticket code");
    }

    ticket.ticketCode = ticketCode;
    ticket.paymentStatus = "completed";
    ticket.status = "valid";

    if (receiptNumber) {
      ticket.paymentMetadata = {
        ...ticket.paymentMetadata,
        receipt: receiptNumber,
      };
    }

    // Generate QR code locally as a data URI
    try {
      ticket.qrCodeUrl = await QRCode.toDataURL(ticket.ticketCode, {
        errorCorrectionLevel: "L",
        margin: 2,
        width: 180,
      });
    } catch (e) {
      this.logger.error(`Failed to generate QR code: ${e.message}`);
      // Fallback to Google Charts stub if local generation fails
      ticket.qrCodeUrl = `https://chart.googleapis.com/chart?cht=qr&chl=${ticket.ticketCode}&chs=180x180&choe=UTF-8&chld=L|2`;
    }

    await manager.save(ticket);

    // 2. HypeCard
    if (ticket.ticketType.event.settings?.hype_card_on_reg) {
      try {
        await this.hypeCardQueue.add("generate", {
          ticketId: ticket.id,
          templateId: "default",
          inputData: {
            name: ticket.holderName,
            event: ticket.ticketType.event.name,
          },
        });
      } catch (e) {
        this.logger.error(`Failed to queue hype card: ${e.message}`);
      }
    }

    // 3. Trigger Campaign
    try {
      await this.triggerService.fire(CampaignTrigger.TICKET_ISSUED, {
        tenantId: ticket.ticketType.event.organizationId,
        contactId: ticket.contactId,
        context: {
          ticketCode: ticket.ticketCode,
          qrCodeUrl: ticket.qrCodeUrl,
          eventName: ticket.ticketType.event.name,
        },
      });
    } catch (e) {
      this.logger.error(`Failed to fire trigger: ${e.message}`);
    }

    // 4. Sync Metadata
    try {
      const contact = await manager.findOne(ContactEntity, {
        where: { id: ticket.contactId },
      });
      if (contact) {
        contact.metadata = {
          ...(contact.metadata || {}),
          ticketCode: ticket.ticketCode,
          eventName: ticket.ticketType.event.name,
        };
        await manager.save(contact);
      }
    } catch (e) {
      this.logger.error(`Failed to sync ticket metadata: ${e.message}`);
    }

    this.logger.log(`Ticket ${ticket.ticketCode} fulfilled successfully`);
  }

  async getStatus(ticketId: string) {
    return this.ticketRepo.findOne({
      where: { id: ticketId },
      select: ["id", "paymentStatus", "status", "ticketCode", "qrCodeUrl"],
    });
  }

  async findAll(eventId: string): Promise<EosTicket[]> {
    return this.ticketRepo.find({
      where: { ticketType: { eventId: eventId } },
      relations: ["ticketType", "contact", "hypeCard"],
      order: { createdAt: "DESC" },
    });
  }

  async checkIn(ticketCode: string): Promise<EosTicket> {
    const ticket = await this.ticketRepo.findOne({
      where: { ticketCode },
      relations: ["ticketType", "ticketType.event"],
    });

    if (!ticket) {
      throw new BadRequestException("Invalid ticket code");
    }

    if (ticket.status === "used") {
      throw new BadRequestException("Ticket already used");
    }

    if (ticket.status !== "valid") {
      throw new BadRequestException(`Ticket status is ${ticket.status}`);
    }

    // Mark used
    ticket.status = "used";
    ticket.checkedInAt = new Date();
    await this.ticketRepo.save(ticket);

    // Fire check-in trigger
    await this.triggerService.fire(CampaignTrigger.EVENT_CHECKIN, {
      tenantId: ticket.ticketType.event.organizationId,
      contactId: ticket.contactId,
      context: {
        ticketCode: ticket.ticketCode,
        eventName: ticket.ticketType.event.name,
        checkedInAt: ticket.checkedInAt.toISOString(),
      },
    });

    return ticket;
  }
}
