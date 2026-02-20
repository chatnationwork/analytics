import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { EosEngagementService } from "./eos-engagement.service";
import { CreatePollDto } from "./dto/create-poll.dto";

@Controller("eos/events/:eventId/engagement")
@UseGuards(JwtAuthGuard)
export class EosEngagementController {
  constructor(private readonly engagementService: EosEngagementService) {}

  @Post("polls")
  async createPoll(
    @Param("eventId") eventId: string,
    @Body() dto: CreatePollDto,
  ) {
    return this.engagementService.createPoll({ ...dto, eventId });
  }

  @Get("polls/:ownerType/:ownerId")
  async listPolls(
    @Param("ownerType") ownerType: string,
    @Param("ownerId") ownerId: string,
  ) {
    // Note: Returns active and inactive for admin view
    return this.engagementService.findPolls(ownerType, ownerId, false);
  }

  @Get("polls/:pollId/results")
  async getResults(@Param("pollId") pollId: string) {
    return this.engagementService.getPollResults(pollId);
  }

  @Patch("polls/:pollId/deactivate")
  async deactivate(@Param("pollId") pollId: string) {
    return this.engagementService.deactivatePoll(pollId);
  }

  @Get("feedback/:targetType/:targetId/stats")
  async getFeedbackStats(
    @Param("targetType") targetType: string,
    @Param("targetId") targetId: string,
  ) {
    return this.engagementService.getTargetStats(targetType, targetId);
  }
}
