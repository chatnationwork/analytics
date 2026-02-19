import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, LessThan } from "typeorm";
import { EosTicket, EosTicketType } from "@lib/database";

/**
 * Cleans up stale ticket reservations.
 * Tickets in "reserved" status older than 30 minutes are cancelled
 * and their quantity returned to the pool.
 */
@Injectable()
export class EosTicketCleanupCron {
  private readonly logger = new Logger(EosTicketCleanupCron.name);

  constructor(
    @InjectRepository(EosTicket)
    private readonly ticketRepo: Repository<EosTicket>,
    @InjectRepository(EosTicketType)
    private readonly ticketTypeRepo: Repository<EosTicketType>,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleExpiredReservations() {
    const cutoff = new Date(Date.now() - 30 * 60 * 1000); // 30 minutes ago

    const expiredTickets = await this.ticketRepo.find({
      where: {
        status: "reserved" as any,
        createdAt: LessThan(cutoff),
      },
      relations: ["ticketType"],
    });

    if (expiredTickets.length === 0) return;

    this.logger.log(
      `Found ${expiredTickets.length} expired reservation(s), cleaning up...`,
    );

    for (const ticket of expiredTickets) {
      try {
        // Cancel the ticket
        ticket.status = "cancelled";
        ticket.paymentStatus = "failed";
        await this.ticketRepo.save(ticket);

        // Return quantity to pool
        if (ticket.ticketType) {
          await this.ticketTypeRepo.decrement(
            { id: ticket.ticketType.id },
            "quantitySold",
            1,
          );
          this.logger.log(
            `Expired reservation ${ticket.id} cancelled, quantity returned to ${ticket.ticketType.name}`,
          );
        }
      } catch (err) {
        this.logger.error(
          `Failed to clean up ticket ${ticket.id}: ${err.message}`,
        );
      }
    }
  }
}
