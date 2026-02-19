import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Job } from "bullmq";
import { Logger, Inject, forwardRef } from "@nestjs/common";
import { WalletService } from "../../billing/wallet.service";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { EosTicket } from "@lib/database";
import { GeneratedCardService } from "../generated-card.service";
import { EosTicketService } from "../eos-ticket.service";

@Processor("eos-hypecard-generation", { concurrency: 10 })
export class HypeCardWorker extends WorkerHost {
  private readonly logger = new Logger(HypeCardWorker.name);

  constructor(
    private readonly walletService: WalletService,
    @InjectRepository(EosTicket)
    private readonly ticketRepo: Repository<EosTicket>,
    private readonly generatedCardService: GeneratedCardService,
    @Inject(forwardRef(() => EosTicketService))
    private readonly ticketService: EosTicketService,
  ) {
    super();
  }

  async process(
    job: Job<{ ticketId: string; templateId: string; inputData: any }>,
  ): Promise<void> {
    this.logger.log(`Generating hype card for ticket ${job.data.ticketId}`);

    // 1. Fetch Ticket & Event
    const ticket = await this.ticketRepo.findOne({
      where: { id: job.data.ticketId },
      relations: ["ticketType", "ticketType.event"],
    });

    if (!ticket) {
      this.logger.error(`Ticket ${job.data.ticketId} not found in worker`);
      return;
    }

    const organizationId = ticket.ticketType.event.organizationId;

    // 2. Generate Card (DB record + mock external call)
    const card = await this.generatedCardService.create(
      organizationId,
      job.data.templateId,
      job.data.inputData,
    );

    // TODO: In Phase 3.5b, call real media generation API here
    // For now, simulate completion
    await this.generatedCardService.updateStatus(
      card.id,
      "completed",
      "https://example.com/mock-hypecard.png",
    );

    // 3. Debit Wallet
    await this.walletService.debit({
      organizationId,
      amount: 1,
      module: "events",
      action: "generate_hypecard",
      referenceId: job.data.ticketId,
    });

    // 4. Update Ticket with real card ID
    ticket.hypeCardId = card.id;
    await this.ticketRepo.save(ticket);

    this.logger.log(
      `Hype card ${card.id} generated and linked to ticket ${ticket.id}`,
    );

    // 5. Trigger final fulfillment message
    await this.ticketService.sendFulfillmentMessage(ticket.id);
  }
}
