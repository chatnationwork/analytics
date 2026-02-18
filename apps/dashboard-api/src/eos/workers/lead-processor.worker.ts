import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Job } from "bullmq";
import { Logger } from "@nestjs/common";
import { EosLeadService } from "../eos-lead.service";

@Processor("eos-lead-processing", { concurrency: 5 })
export class LeadProcessorWorker extends WorkerHost {
  private readonly logger = new Logger(LeadProcessorWorker.name);

  constructor(private readonly leadService: EosLeadService) {
    super();
  }

  async process(
    job: Job<{ leadId: string; transcript: string }>,
  ): Promise<void> {
    this.logger.log(`Processing lead analysis for job ${job.id}`);
    try {
      await this.leadService.analyzeIntent(
        job.data.leadId,
        job.data.transcript,
      );
    } catch (error) {
      this.logger.error(
        `Failed to process lead ${job.data.leadId}: ${error.message}`,
      );
      throw error; // Let BullMQ handle retries
    }
  }
}
