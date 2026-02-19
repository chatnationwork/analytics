import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, LessThan } from "typeorm";
import { EosEvent } from "@lib/database";
import { EosEventService } from "./eos-event.service";

/**
 * Manages the transition from "grace_period" to "completed".
 * When an event's grace period expires, it finalizes the event
 * and triggers post-event communications.
 */
@Injectable()
export class EosEventLifecycleCron {
  private readonly logger = new Logger(EosEventLifecycleCron.name);

  constructor(
    @InjectRepository(EosEvent)
    private readonly eventRepo: Repository<EosEvent>,
    private readonly eventService: EosEventService,
  ) {}

  @Cron("0 */15 * * * *")
  async handleGracePeriodExpiry() {
    const expiredEvents = await this.eventRepo.find({
      where: {
        status: "grace_period" as any,
        gracePeriodEndsAt: LessThan(new Date()),
      },
    });

    if (expiredEvents.length === 0) return;

    this.logger.log(
      `Found ${expiredEvents.length} event(s) with expired grace period, finalizing...`,
    );

    for (const event of expiredEvents) {
      try {
        await this.eventService.finalizeEvent(event.id);
        this.logger.log(
          `Event ${event.id} (${event.name}) finalized successfully.`,
        );
      } catch (err) {
        this.logger.error(
          `Failed to finalize event ${event.id}: ${err.message}`,
        );
      }
    }
  }
}
