import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { EosPoll } from "@lib/database/entities/eos-poll.entity";
import { EosPollOption } from "@lib/database/entities/eos-poll-option.entity";
import { EosPollResponse } from "@lib/database/entities/eos-poll-response.entity";
import { EosFeedback } from "@lib/database/entities/eos-feedback.entity";

@Injectable()
export class EosEngagementService {
  constructor(
    @InjectRepository(EosPoll)
    private readonly pollRepo: Repository<EosPoll>,
    @InjectRepository(EosPollOption)
    private readonly pollOptionRepo: Repository<EosPollOption>,
    @InjectRepository(EosPollResponse)
    private readonly pollResponseRepo: Repository<EosPollResponse>,
    @InjectRepository(EosFeedback)
    private readonly feedbackRepo: Repository<EosFeedback>,
  ) {}

  // --- Poll Management ---

  async createPoll(data: {
    eventId: string;
    ownerId: string;
    ownerType: "event" | "exhibitor" | "speaker";
    question: string;
    options: string[];
  }) {
    const poll = this.pollRepo.create({
      eventId: data.eventId,
      ownerId: data.ownerId,
      ownerType: data.ownerType,
      question: data.question,
    });

    const savedPoll = await this.pollRepo.save(poll);

    const options = data.options.map((text, index) =>
      this.pollOptionRepo.create({
        pollId: savedPoll.id,
        text,
        order: index,
      }),
    );

    await this.pollOptionRepo.save(options);
    return this.findOnePoll(savedPoll.id);
  }

  async findOnePoll(id: string) {
    const poll = await this.pollRepo.findOne({
      where: { id },
      relations: ["options", "options.responses"],
    });
    if (!poll) throw new NotFoundException("Poll not found");
    return poll;
  }

  async findPolls(ownerType: string, ownerId: string, activeOnly = true) {
    const where: any = {
      ownerType: ownerType as any,
      ownerId,
    };
    if (activeOnly) {
      where.isActive = true;
    }
    return this.pollRepo.find({
      where,
      relations: ["options"],
      order: { createdAt: "DESC" },
    });
  }

  async deactivatePoll(id: string) {
    await this.pollRepo.update(id, { isActive: false });
    return { success: true };
  }

  // --- Responses ---

  async respondToPoll(pollOptionId: string, contactId?: string) {
    const option = await this.pollOptionRepo.findOne({
      where: { id: pollOptionId },
    });
    if (!option) throw new NotFoundException("Poll option not found");

    const response = this.pollResponseRepo.create({
      pollOptionId,
      contactId,
    });

    return this.pollResponseRepo.save(response);
  }

  // --- Feedback ---

  async submitFeedback(data: {
    eventId: string;
    targetId: string;
    targetType: "event" | "exhibitor" | "speaker";
    contactId?: string;
    rating: number;
    comment?: string;
  }) {
    const feedback = this.feedbackRepo.create(data);
    return this.feedbackRepo.save(feedback);
  }

  async getFeedbackForTarget(targetType: string, targetId: string) {
    return this.feedbackRepo.find({
      where: {
        targetType: targetType as any,
        targetId,
      },
      order: { createdAt: "DESC" },
    });
  }

  // --- Analytics ---

  async getPollResults(pollId: string) {
    const poll = await this.findOnePoll(pollId);

    return {
      id: poll.id,
      question: poll.question,
      results: poll.options.map((opt) => ({
        id: opt.id,
        text: opt.text,
        count: opt.responses.length,
      })),
    };
  }

  async getTargetStats(targetType: string, targetId: string) {
    const feedbacks = await this.getFeedbackForTarget(targetType, targetId);
    const avgRating =
      feedbacks.length > 0
        ? feedbacks.reduce((acc, f) => acc + f.rating, 0) / feedbacks.length
        : 0;

    return {
      totalFeedback: feedbacks.length,
      averageRating: Number(avgRating.toFixed(1)),
      feedbacks: feedbacks.slice(0, 5), // Recent 5
    };
  }
}
