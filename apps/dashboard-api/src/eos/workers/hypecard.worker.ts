import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Job } from "bullmq";
import { Logger } from "@nestjs/common";
import { WalletService } from "../../billing/wallet.service";
// import { GeneratedCardRepository } from '@lib/database'; // Assuming this exists or mocked
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { EosTicket } from "@lib/database";

@Processor("eos-hypecard-generation", { concurrency: 10 })
export class HypeCardWorker extends WorkerHost {
  private readonly logger = new Logger(HypeCardWorker.name);

  constructor(
    private readonly walletService: WalletService,
    @InjectRepository(EosTicket)
    private readonly ticketRepo: Repository<EosTicket>,
  ) {
    super();
  }

  async process(
    job: Job<{ ticketId: string; templateId: string; inputData: any }>,
  ): Promise<void> {
    this.logger.log(`Generating hype card for ticket ${job.data.ticketId}`);

    // 1. Generate Card (Mocking external call)
    const mockHypeCardId = `card_${Date.now()}`;
    // Insert into generated_cards table here if repo available

    // 2. Debit Wallet
    // Need organizationId.
    const ticket = await this.ticketRepo.findOne({
      where: { id: job.data.ticketId },
      relations: ["ticketType", "ticketType.event"],
    });

    if (ticket) {
      await this.walletService.debit({
        organizationId: ticket.ticketType.event.organizationId,
        amount: 1,
        module: "events",
        action: "generate_hypecard",
        referenceId: job.data.ticketId,
      });

      // 3. Update Ticket
      ticket.hypeCardId = mockHypeCardId;
      await this.ticketRepo.save(ticket);
    }
  }
}
