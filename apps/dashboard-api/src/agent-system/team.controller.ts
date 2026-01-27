/**
 * =============================================================================
 * TEAM CONTROLLER
 * =============================================================================
 *
 * API endpoints for team management.
 * - List teams
 * - Create/update teams
 * - Manage team members
 */

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Request,
  UseGuards,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TeamEntity, TeamMemberEntity, TeamRole, UserEntity } from '@lib/database';

/**
 * DTO for creating a team
 */
interface CreateTeamDto {
  name: string;
  description?: string;
  routingStrategy?: string;
}

/**
 * DTO for adding a member to a team
 */
interface AddMemberDto {
  userId: string; // Can be UUID or Email
  role?: TeamRole;
}

/**
 * Controller for team management operations.
 */
@Controller('agent/teams')
@UseGuards(JwtAuthGuard)
export class TeamController {
  constructor(
    @InjectRepository(TeamEntity)
    private readonly teamRepo: Repository<TeamEntity>,
    @InjectRepository(TeamMemberEntity)
    private readonly memberRepo: Repository<TeamMemberEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
  ) {}

  /**
   * List all teams for the tenant
   */
  @Get()
  async listTeams(@Request() req: { user: { tenantId: string } }) {
    return this.teamRepo.find({
      where: { tenantId: req.user.tenantId },
      relations: ['members'],
    });
  }

  /**
   * Get a specific team with members
   */
  @Get(':teamId')
  async getTeam(@Param('teamId') teamId: string) {
    return this.teamRepo.findOne({
      where: { id: teamId },
      relations: ['members', 'members.user'],
    });
  }

  /**
   * Create a new team
   */
  @Post()
  async createTeam(
    @Request() req: { user: { tenantId: string } },
    @Body() dto: CreateTeamDto,
  ) {
    const team = this.teamRepo.create({
      ...dto,
      tenantId: req.user.tenantId,
    });

    return this.teamRepo.save(team);
  }

  /**
   * Update a team
   */
  @Put(':teamId')
  async updateTeam(
    @Param('teamId') teamId: string,
    @Body() dto: Partial<CreateTeamDto>,
  ) {
    await this.teamRepo.update(teamId, dto);
    return this.teamRepo.findOne({ where: { id: teamId } });
  }

  /**
   * Delete a team
   */
  @Delete(':teamId')
  async deleteTeam(@Param('teamId') teamId: string) {
    await this.teamRepo.delete(teamId);
    return { success: true };
  }

  /**
   * Add a member to a team
   */
  @Post(':teamId/members')
  async addMember(
    @Param('teamId') teamId: string,
    @Body() dto: AddMemberDto,
  ) {
    let targetUserId = dto.userId;

    // Check if input is email (simple regex or includes @)
    if (targetUserId.includes('@')) {
        const user = await this.userRepo.findOne({ where: { email: targetUserId } });
        if (!user) {
            throw new NotFoundException(`User with email ${targetUserId} not found. Please invite them first from Settings > Team.`);
        }
        targetUserId = user.id;
    }

    // Check if already a member
    const existing = await this.memberRepo.findOne({
        where: { teamId, userId: targetUserId }
    });
    
    if (existing) {
        throw new BadRequestException('User is already a member of this team');
    }

    const member = this.memberRepo.create({
      teamId,
      userId: targetUserId,
      role: dto.role || TeamRole.MEMBER,
    });

    return this.memberRepo.save(member);
  }

  /**
   * Remove a member from a team
   */
  @Delete(':teamId/members/:userId')
  async removeMember(
    @Param('teamId') teamId: string,
    @Param('userId') userId: string,
  ) {
    await this.memberRepo.delete({ teamId, userId });
    return { success: true };
  }

  /**
   * Update a member's role
   */
  @Put(':teamId/members/:userId')
  async updateMemberRole(
    @Param('teamId') teamId: string,
    @Param('userId') userId: string,
    @Body() dto: { role: TeamRole },
  ) {
    await this.memberRepo.update({ teamId, userId }, { role: dto.role });
    return this.memberRepo.findOne({ where: { teamId, userId } });
  }
}
