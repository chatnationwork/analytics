import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  NotFoundException,
} from "@nestjs/common";
import { EosExhibitorService } from "./eos-exhibitor.service";
import { EosEventService } from "./eos-event.service";

@Controller("eos/public")
export class EosPublicController {
  constructor(
    private readonly exhibitorService: EosExhibitorService,
    private readonly eventService: EosEventService,
  ) {}

  @Get("exhibitors/onboarding/:token")
  async getOnboardingInfo(@Param("token") token: string) {
    const exhibitor = await this.exhibitorService.findByToken(token);
    if (!exhibitor) throw new NotFoundException("Invitation not found");

    const event = await this.eventService.findOnePublic(exhibitor.eventId);

    return {
      exhibitor: {
        id: exhibitor.id,
        name: exhibitor.name,
        contactName: exhibitor.contactName,
      },
      event: {
        id: event.id,
        name: event.name,
        coverImageUrl: event.coverImageUrl,
        description: event.description,
      },
    };
  }

  @Post("exhibitors/onboarding/:token/accept")
  async acceptInvitation(
    @Param("token") token: string,
    @Body() body: { description: string; logoUrl?: string },
  ) {
    const exhibitor = await this.exhibitorService.findByToken(token);
    if (!exhibitor) throw new NotFoundException("Invitation not found");

    return this.exhibitorService.update(exhibitor.id, {
      ...body,
      status: "pending",
      invitationToken: null, // Clear token after use
    });
  }
}
