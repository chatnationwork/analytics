
import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards, Request, BadRequestException } from '@nestjs/common';
import { Request as ExpressRequest } from 'express';
import { InvitationsService } from './invitations.service';
import { MembershipRole } from '@lib/database/entities/tenant-membership.entity';
import { JwtAuthGuard } from '../auth';

@Controller()
@UseGuards(JwtAuthGuard)
export class InvitationsController {
  constructor(private readonly invitationsService: InvitationsService) {}

  @Get('tenants/:tenantId/invitations')
  async listPending(@Param('tenantId') tenantId: string) {
    return this.invitationsService.getPendingInvitations(tenantId);
  }

  @Post('tenants/:tenantId/invitations')
  async inviteUser(
    @Param('tenantId') tenantId: string,
    @Body() body: { email: string; role?: MembershipRole },
    @Request() req: ExpressRequest & { user: { id: string } }
  ) {
    return this.invitationsService.createInvitation(
        tenantId, 
        body.email, 
        req.user.id, 
        body.role
    );
  }

  @Delete('tenants/:tenantId/invitations/:id')
  async revokeInvitation(
      @Param('tenantId') tenantId: string,
      @Param('id') id: string
  ) {
      return this.invitationsService.revokeInvitation(tenantId, id);
  }

  @Post('invitations/accept')
  async acceptInvitation(
      @Body() body: { token: string },
      @Request() req: ExpressRequest & { user: { id: string } }
  ) {
      return this.invitationsService.acceptInvitation(body.token, req.user.id);
  }
}

/**
 * Public controller for invitation validation (no auth required)
 */
@Controller('invitations')
export class PublicInvitationsController {
  constructor(private readonly invitationsService: InvitationsService) {}

  @Get('validate')
  async validateInvitation(@Query('token') token: string) {
      if (!token) {
          return { valid: false, message: 'Token is required' };
      }
      return this.invitationsService.getInvitationByToken(token);
  }

  @Post('claim')
  async claimInvitation(
      @Body() body: { token: string; password: string; name?: string }
  ) {
      if (!body.token || !body.password) {
          throw new BadRequestException('Token and password are required');
      }
      
      const result = await this.invitationsService.claimInvitation(
          body.token,
          body.password,
          body.name
      );
      
      return {
          success: true,
          message: 'Account created and invitation accepted',
          userId: result.user.id,
          email: result.user.email
      };
  }
}
