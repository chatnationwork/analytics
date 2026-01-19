/**
 * =============================================================================
 * JWT STRATEGY
 * =============================================================================
 * 
 * Passport strategy for validating JWT tokens.
 * Extracts the JWT from the Authorization header and validates it.
 */

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthService, JwtPayload, AuthUser } from './auth.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
  ) {
    super({
      // Extract JWT from Authorization: Bearer <token>
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      // Don't ignore expiration
      ignoreExpiration: false,
      // Use same secret as for signing
      secretOrKey: configService.get<string>('auth.jwtSecret', 'analytics-jwt-secret-dev'),
    });
  }

  /**
   * Called after JWT is verified.
   * Returns the user object that will be attached to request.user
   */
  async validate(payload: JwtPayload): Promise<AuthUser> {
    const user = await this.authService.validateUser(payload.sub);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    return user;
  }
}
