/**
 * Contact profile API – profile, notes, and history for inbox contacts.
 */

import {
  Controller,
  Get,
  Patch,
  Post,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  BadRequestException,
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { AuthUser } from "../auth/auth.service";
import {
  ContactProfileService,
  UpdateContactProfileDto,
} from "./contact-profile.service";
import { getRequestContext, type RequestLike } from "../request-context";

@Controller("agent/contacts")
@UseGuards(JwtAuthGuard)
export class ContactProfileController {
  constructor(private readonly contactProfileService: ContactProfileService) {}

  @Get(":contactId")
  async getContact(
    @CurrentUser() user: AuthUser,
    @Param("contactId") contactId: string,
    @Query("name") name?: string,
  ) {
    return this.contactProfileService.getContact(
      user.tenantId,
      contactId,
      name ?? undefined,
    );
  }

  @Patch(":contactId")
  async updateContact(
    @CurrentUser() user: AuthUser,
    @Param("contactId") contactId: string,
    @Body() dto: UpdateContactProfileDto,
    @Req() req: RequestLike,
  ) {
    const requestContext = getRequestContext(req);
    return this.contactProfileService.updateContact(
      user.tenantId,
      contactId,
      user.id,
      dto,
      requestContext,
    );
  }

  @Get(":contactId/notes")
  async getNotes(
    @CurrentUser() user: AuthUser,
    @Param("contactId") contactId: string,
    @Query("limit") limit?: string,
  ) {
    return this.contactProfileService.getNotes(
      user.tenantId,
      contactId,
      limit ? Math.min(parseInt(limit, 10) || 50, 100) : 50,
    );
  }

  @Post(":contactId/notes")
  async addNote(
    @CurrentUser() user: AuthUser,
    @Param("contactId") contactId: string,
    @Body() body: { content: string },
  ) {
    const content =
      body?.content && typeof body.content === "string"
        ? body.content.trim()
        : "";
    if (!content) {
      throw new BadRequestException("content is required");
    }
    return this.contactProfileService.addNote(
      user.tenantId,
      contactId,
      user.id,
      content,
    );
  }

  @Get(":contactId/history")
  async getHistory(
    @CurrentUser() user: AuthUser,
    @Param("contactId") contactId: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    return this.contactProfileService.getContactHistory(
      user.tenantId,
      contactId,
      page ? parseInt(page, 10) || 1 : 1,
      limit ? Math.min(parseInt(limit, 10) || 20, 50) : 20,
    );
  }
}
