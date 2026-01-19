
import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InvitationEntity, InvitationStatus } from '@lib/database/entities/invitation.entity';
import { TenantMembershipEntity, MembershipRole } from '@lib/database/entities/tenant-membership.entity';
import { UserEntity } from '@lib/database/entities/user.entity';
import * as crypto from 'crypto';

@Injectable()
export class InvitationsService {
  constructor(
    @InjectRepository(InvitationEntity)
    private readonly invitationRepo: Repository<InvitationEntity>,
    @InjectRepository(TenantMembershipEntity)
    private readonly membershipRepo: Repository<TenantMembershipEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
  ) {}

  /**
   * Create a new invitation
   */
  async createInvitation(
    tenantId: string,
    email: string,
    createdByUserId: string,
    role: MembershipRole = 'member'
  ): Promise<InvitationEntity> {
    // 1. Check if user is already a member
    const existingUser = await this.userRepo.findOne({ where: { email } });
    if (existingUser) {
      const existingMembership = await this.membershipRepo.findOne({
        where: { tenantId, userId: existingUser.id }
      });
      if (existingMembership) {
        throw new ConflictException('User is already a member of this workspace');
      }
    }

    // 2. Check for pending invitation
    const existingInvite = await this.invitationRepo.findOne({
      where: { tenantId, email, status: 'pending' }
    });
    
    if (existingInvite) {
        // Extend expiry or return existing?
        // For now, let's just return the existing valid one or update it
        if (existingInvite.expiresAt > new Date()) {
             return existingInvite;
        }
        
        // Expired, mark as expired and create new
        existingInvite.status = 'expired';
        await this.invitationRepo.save(existingInvite);
    }

    // 3. Create new invitation
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

    const invitation = this.invitationRepo.create({
      tenantId,
      email,
      role,
      token,
      expiresAt,
      createdBy: createdByUserId,
      status: 'pending'
    });

    return this.invitationRepo.save(invitation);
  }

  /**
   * List pending invitations for a tenant
   */
  async getPendingInvitations(tenantId: string): Promise<InvitationEntity[]> {
    return this.invitationRepo.find({
      where: { tenantId, status: 'pending' },
      order: { createdAt: 'DESC' }
    });
  }

  /**
   * Cancel/Revoke an invitation
   */
  async revokeInvitation(tenantId: string, invitationId: string): Promise<void> {
    const invite = await this.invitationRepo.findOne({
         where: { id: invitationId, tenantId }
    });
    
    if (!invite) throw new NotFoundException('Invitation not found');
    
    if (invite.status === 'pending') {
        invite.status = 'expired'; // Or we could add 'revoked' status
        await this.invitationRepo.save(invite);
    }
  }

  /**
   * Accept an invitation
   */
  async acceptInvitation(token: string, userId: string): Promise<TenantMembershipEntity> {
      const invite = await this.invitationRepo.findOne({ where: { token, status: 'pending' } });
      
      if (!invite) {
          throw new NotFoundException('Invalid or expired invitation');
      }

      if (invite.expiresAt < new Date()) {
          invite.status = 'expired';
          await this.invitationRepo.save(invite);
          throw new BadRequestException('Invitation has expired');
      }

      // Create membership
      const membership = this.membershipRepo.create({
          tenantId: invite.tenantId,
          userId: userId,
          role: invite.role,
          invitedBy: invite.createdBy
      });

      await this.membershipRepo.save(membership);

      // Update invitation status
      invite.status = 'accepted';
      await this.invitationRepo.save(invite);

      return membership;
  }

  /**
   * Get invitation details by token (public - for validation)
   */
  async getInvitationByToken(token: string): Promise<{
    valid: boolean;
    email?: string;
    role?: string;
    tenantName?: string;
    expired?: boolean;
  }> {
      const invite = await this.invitationRepo.findOne({ 
        where: { token },
        relations: ['tenant']
      });
      
      if (!invite) {
          return { valid: false };
      }

      if (invite.status !== 'pending') {
          return { valid: false, expired: invite.status === 'expired' };
      }

      if (invite.expiresAt < new Date()) {
          invite.status = 'expired';
          await this.invitationRepo.save(invite);
          return { valid: false, expired: true };
      }

      return {
          valid: true,
          email: invite.email,
          role: invite.role,
          tenantName: invite.tenant?.name || 'Unknown Workspace'
      };
  }

  /**
   * Claim an invitation (for new users - creates account and accepts invite)
   */
  async claimInvitation(
    token: string, 
    password: string,
    name?: string
  ): Promise<{ user: UserEntity; membership: TenantMembershipEntity }> {
    const invite = await this.invitationRepo.findOne({ 
      where: { token, status: 'pending' },
      relations: ['tenant']
    });
    
    if (!invite) {
      throw new NotFoundException('Invalid or expired invitation');
    }

    if (invite.expiresAt < new Date()) {
      invite.status = 'expired';
      await this.invitationRepo.save(invite);
      throw new BadRequestException('Invitation has expired');
    }

    // Check if user already exists
    let user = await this.userRepo.findOne({ where: { email: invite.email } });
    
    if (user) {
      // User exists - check if already a member
      const existingMembership = await this.membershipRepo.findOne({
        where: { tenantId: invite.tenantId, userId: user.id }
      });
      
      if (existingMembership) {
        throw new ConflictException('You are already a member of this workspace');
      }
    } else {
      // Create new user
      const bcrypt = await import('bcrypt');
      const passwordHash = await bcrypt.hash(password, 12);
      
      user = this.userRepo.create({
        email: invite.email,
        passwordHash,
        name: name || invite.email.split('@')[0],
        emailVerified: true, // Verified via invitation
      });
      
      await this.userRepo.save(user);
    }

    // Create membership
    const membership = this.membershipRepo.create({
      tenantId: invite.tenantId,
      userId: user.id,
      role: invite.role,
      invitedBy: invite.createdBy
    });

    await this.membershipRepo.save(membership);

    // Update invitation status
    invite.status = 'accepted';
    await this.invitationRepo.save(invite);

    return { user, membership };
  }
}
