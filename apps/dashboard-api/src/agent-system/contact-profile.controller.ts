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
    const contact = await this.contactProfileService.getContact(
      user.tenantId,
      contactId,
      name ?? undefined,
    );
    return { data: contact };
  }

  @Patch(":contactId")
  async updateContact(
    @CurrentUser() user: AuthUser,
    @Param("contactId") contactId: string,
    @Body() dto: UpdateContactProfileDto,
    @Req() req: RequestLike,
  ) {
    const requestContext = getRequestContext(req);
    const contact = await this.contactProfileService.updateContact(
      user.tenantId,
      contactId,
      user.id,
      dto,
      requestContext,
    );
    return { data: contact };
  }

  @Get(":contactId/notes")
  async getNotes(
    @CurrentUser() user: AuthUser,
    @Param("contactId") contactId: string,
    @Query("limit") limit?: string,
  ) {
    const data = await this.contactProfileService.getNotes(
      user.tenantId,
      contactId,
      limit ? Math.min(parseInt(limit, 10) || 50, 100) : 50,
    );
    return { data };
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
    const note = await this.contactProfileService.addNote(
      user.tenantId,
      contactId,
      user.id,
      content,
    );
    return { data: note };
  }

  @Get(":contactId/history")
  async getHistory(
    @CurrentUser() user: AuthUser,
    @Param("contactId") contactId: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    const result = await this.contactProfileService.getContactHistory(
      user.tenantId,
      contactId,
      page ? parseInt(page, 10) || 1 : 1,
      limit ? Math.min(parseInt(limit, 10) || 20, 50) : 20,
    );
    return { data: result.data, total: result.total };
  }
}
