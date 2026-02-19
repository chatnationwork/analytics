import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { GeneratedCard } from "@lib/database";

@Injectable()
export class GeneratedCardService {
  private readonly logger = new Logger(GeneratedCardService.name);

  constructor(
    @InjectRepository(GeneratedCard)
    private readonly generatedCardRepo: Repository<GeneratedCard>,
  ) {}

  async create(
    organizationId: string,
    templateId: string,
    inputData: any,
  ): Promise<GeneratedCard> {
    const card = this.generatedCardRepo.create({
      organizationId,
      templateId,
      inputData,
      status: "pending",
    });
    return this.generatedCardRepo.save(card);
  }

  async updateStatus(
    id: string,
    status: "completed" | "failed",
    outputUrl?: string,
  ): Promise<void> {
    await this.generatedCardRepo.update(id, {
      status,
      outputUrl,
    });
  }
}
