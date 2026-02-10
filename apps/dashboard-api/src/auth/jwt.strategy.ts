/**
 * =============================================================================
 * JWT STRATEGY
 * =============================================================================
 *
 * Passport strategy for validating JWT tokens.
 * Extracts the JWT from the Authorization header and validates it.
 */

import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { AuthService, JwtPayload, AuthUser } from "./auth.service";

import { TenantRepository } from "@lib/database";
// ... imports

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
    private readonly tenantRepository: TenantRepository,
  ) {
    super({
      // Extract JWT from Authorization: Bearer <token>
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      // Don't ignore expiration
      ignoreExpiration: false,
      // Use same secret as for signing
      secretOrKey: configService.get<string>(
        "auth.jwtSecret",
        "analytics-jwt-secret-dev",
      ),
    });
  }

  /**
   * Called after JWT is verified.
   * Returns the user object that will be attached to request.user
   */
  async validate(payload: JwtPayload): Promise<AuthUser> {
    const user = await this.authService.validateUser(payload.sub);
    if (!user) {
      throw new UnauthorizedException("User not found");
    }

    // Token issued for forced password change (expired password flow). No session
    // exists yet; allow access only to change-password so the user can set a new password.
    if (payload.mustChangePassword === true) {
      return user;
    }

    const tenants = await this.tenantRepository.findByUserId(user.id);
    const activeTenant = tenants[0];
    const singleLoginEnforced =
      activeTenant?.settings?.session?.singleLoginEnforced === true;

    // When single login is enforced, tokens without sessionId (legacy) are invalid
    // so that we have a stored session for every active user and can require
    // verification when they log in from another device.
    if (singleLoginEnforced && !payload.sessionId) {
      throw new UnauthorizedException("Session invalid. Please sign in again.");
    }

    const isSessionValid = await this.authService.isSessionValid(
      payload.sub,
      payload.sessionId,
    );
    if (!isSessionValid) {
      throw new UnauthorizedException(
        "Session has been replaced by another login",
      );
    }

    if (
      activeTenant &&
      activeTenant.settings &&
      activeTenant.settings.session?.sessionsRevokedAt
    ) {
      const revokedAt =
        new Date(activeTenant.settings.session.sessionsRevokedAt).getTime() /
        1000;
      if (payload.iat && payload.iat < revokedAt) {
        throw new UnauthorizedException("Session has been revoked");
      }
    }

    return user;
  }
}
