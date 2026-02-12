/**
 * Danger Zone Controller
 * Archive + delete for users, roles, teams. Requires specific permissions.
 */

import {
  Controller,
  Post,
  Param,
  UseGuards,
  Request,
  Req,
  ForbiddenException,
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { DangerZoneService } from "./danger-zone.service";
import { Permission } from "@lib/database";
import type { RequestLike } from "../request-context";

function hasPermission(
  user: { permissions?: { global?: string[] } },
  permission: Permission,
): boolean {
  return user.permissions?.global?.includes(permission) === true;
}

@Controller("settings/danger-zone")
@UseGuards(JwtAuthGuard)
export class DangerZoneController {
  constructor(private readonly dangerZoneService: DangerZoneService) {}

  @Post("archive-and-delete/role/:id")
  async archiveAndDeleteRole(
    @Request() req: {
      user: {
        id: string;
        tenantId: string;
        permissions?: { global?: string[] };
      };
    },
    @Param("id") roleId: string,
    @Req() expressReq: RequestLike,
  ) {
    if (!hasPermission(req.user, Permission.ROLES_DELETE)) {
      throw new ForbiddenException("Insufficient permissions");
    }
    const tenantId = req.user.tenantId;
    if (!tenantId) throw new ForbiddenException("Tenant context required");

    return this.dangerZoneService.archiveAndDeleteRole(
      roleId,
      tenantId,
      req.user.id,
      expressReq,
    );
  }

  @Post("archive-and-delete/team/:id")
  async archiveAndDeleteTeam(
    @Request() req: {
      user: {
        id: string;
        tenantId: string;
        permissions?: { global?: string[] };
      };
    },
    @Param("id") teamId: string,
    @Req() expressReq: RequestLike,
  ) {
    if (!hasPermission(req.user, Permission.TEAMS_DELETE)) {
      throw new ForbiddenException("Insufficient permissions");
    }

    return this.dangerZoneService.archiveAndDeleteTeam(
      teamId,
      req.user.tenantId,
      req.user.id,
      expressReq,
    );
  }

  @Post("archive-and-delete/user/:id")
  async archiveAndDeactivateUser(
    @Request() req: {
      user: {
        id: string;
        tenantId: string;
        permissions?: { global?: string[] };
      };
    },
    @Param("id") userId: string,
    @Req() expressReq: RequestLike,
  ) {
    if (!hasPermission(req.user, Permission.USERS_DELETE)) {
      throw new ForbiddenException("Insufficient permissions");
    }

    return this.dangerZoneService.archiveAndDeactivateUser(
      userId,
      req.user.tenantId,
      req.user.id,
      expressReq,
    );
  }
}
