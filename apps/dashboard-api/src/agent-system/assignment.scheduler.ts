import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { InboxSessionEntity, SessionStatus } from "@lib/database";
import { AssignmentService } from "./assignment.service";

@Injectable()
export class AssignmentScheduler {
  private readonly logger = new Logger(AssignmentScheduler.name);

  constructor(
    private readonly assignmentService: AssignmentService,
    @InjectRepository(InboxSessionEntity)
    private readonly sessionRepo: Repository<InboxSessionEntity>,
  ) {}

  /**
   * Periodically check for unassigned sessions that have a team but no agent.
   * Runs every 10 seconds.
   */
  @Cron("*/10 * * * * *")
  async processUnassignedSessions() {
    try {
      // Find tenants that have unassigned sessions (status=UNASSIGNED)
      const tenants = await this.sessionRepo
        .createQueryBuilder("session")
        .select("DISTINCT session.tenantId", "tenantId")
        .where("session.status = :status", { status: SessionStatus.UNASSIGNED })
        .getRawMany();

      for (const { tenantId } of tenants) {
        // Trigger assignment for each tenant with unassigned sessions
        await this.assignmentService.assignQueuedSessionsToAvailableAgents(
          tenantId,
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to process unassigned sessions: ${error.message}`,
        error.stack,
      );
    }
  }
}
