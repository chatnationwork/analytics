import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  NotFoundException,
} from "@nestjs/common";
import { EosExhibitorService } from "./eos-exhibitor.service";
import { EosSpeakerService } from "./eos-speaker.service";
import { EosEventService } from "./eos-event.service";
import { EosEngagementService } from "./eos-engagement.service";

@Controller("eos/public")
export class EosPublicController {
  constructor(
    private readonly exhibitorService: EosExhibitorService,
    private readonly speakerService: EosSpeakerService,
    private readonly eventService: EosEventService,
    private readonly engagementService: EosEngagementService,
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
      // Keep invitationToken for profile portal access
    });
  }

  @Get("exhibitors/booth/:token")
  async getBoothInfo(@Param("token") token: string) {
    const exhibitor = await this.exhibitorService.findByBoothToken(token);
    if (!exhibitor) throw new NotFoundException("Booth not found");

    return {
      exhibitor: {
        id: exhibitor.id,
        name: exhibitor.name,
        boothNumber: exhibitor.boothNumber,
      },
      event: {
        id: exhibitor.event.id,
        name: exhibitor.event.name,
      },
    };
  }

  @Post("exhibitors/booth/:token/capture-lead")
  async captureLead(
    @Param("token") token: string,
    @Body() body: { ticketCode: string; notes?: string },
  ) {
    const exhibitor = await this.exhibitorService.findByBoothToken(token);
    if (!exhibitor) throw new NotFoundException("Booth not found");

    return this.exhibitorService.captureLead(
      exhibitor.id,
      body.ticketCode,
      body.notes,
    );
  }

  // --- Speaker Portal ---

  @Get("speakers/portal/:token")
  async getSpeakerPortalInfo(@Param("token") token: string) {
    const speaker = await this.speakerService.findByToken(token);
    if (!speaker) throw new NotFoundException("Speaker portal not found");

    return {
      speaker,
      event: {
        id: speaker.event.id,
        name: speaker.event.name,
        coverImageUrl: speaker.event.coverImageUrl,
      },
    };
  }

  @Post("speakers/portal/:token/update")
  async updateSpeakerPortal(@Param("token") token: string, @Body() body: any) {
    const speaker = await this.speakerService.findByToken(token);
    if (!speaker) throw new NotFoundException("Speaker portal not found");

    return this.speakerService.update(speaker.id, body);
  }

  // --- Exhibitor Portal (Expanded) ---

  @Get("exhibitors/portal/:token")
  async getExhibitorPortalInfo(@Param("token") token: string) {
    // Reusing invitation token for portal access for now, or could use booth token
    const exhibitor = await this.exhibitorService.findByToken(token);
    if (!exhibitor) throw new NotFoundException("Exhibitor portal not found");

    const event = await this.eventService.findOnePublic(exhibitor.eventId);

    return {
      exhibitor,
      event: {
        id: event.id,
        name: event.name,
        coverImageUrl: event.coverImageUrl,
      },
    };
  }

  @Post("exhibitors/portal/:token/update")
  async updateExhibitorPortal(
    @Param("token") token: string,
    @Body() body: any,
  ) {
    const exhibitor = await this.exhibitorService.findByToken(token);
    if (!exhibitor) throw new NotFoundException("Exhibitor portal not found");

    return this.exhibitorService.update(exhibitor.id, body);
  }

  // --- Engagement (Polls & Feedback) ---

  @Get("engagement/polls/active/:ownerType/:ownerId")
  async getActivePolls(
    @Param("ownerType") ownerType: string,
    @Param("ownerId") ownerId: string,
  ) {
    return this.engagementService.findPolls(ownerType, ownerId, true);
  }

  @Post("engagement/polls/respond/:optionId")
  async respondToPoll(
    @Param("optionId") optionId: string,
    @Body() body: { contactId?: string },
  ) {
    return this.engagementService.respondToPoll(optionId, body.contactId);
  }

  @Post("engagement/feedback/submit")
  async submitFeedback(
    @Body()
    body: {
      eventId: string;
      targetId: string;
      targetType: "event" | "exhibitor" | "speaker";
      contactId?: string;
      rating: number;
      comment?: string;
    },
  ) {
    return this.engagementService.submitFeedback(body);
  }

  @Get("engagement/target/:type/:id")
  async getTargetInfo(@Param("type") type: string, @Param("id") id: string) {
    if (type === "event") {
      const event = await this.eventService.findOnePublic(id);
      return { name: event.name, type: "event" };
    } else if (type === "exhibitor") {
      const ex = await this.exhibitorService.findOne(id);
      return { name: ex.name, type: "exhibitor" };
    } else if (type === "speaker") {
      const sp = await this.speakerService.findOne(id);
      return { name: sp.name, type: "speaker" };
    }
    throw new NotFoundException("Target not found");
  }
}
