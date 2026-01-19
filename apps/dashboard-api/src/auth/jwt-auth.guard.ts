/**
 * =============================================================================
 * JWT AUTH GUARD
 * =============================================================================
 * 
 * Guard that protects routes requiring authentication.
 * Uses the JWT strategy to validate the token.
 */

import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * JWT Authentication Guard
 * 
 * Use this guard to protect routes:
 * 
 * @UseGuards(JwtAuthGuard)
 * @Get('protected-route')
 * getProtectedData(@CurrentUser() user: AuthUser) {
 *   return { userId: user.id };
 * }
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  /**
   * Custom error handling.
   * Return 401 Unauthorized with a clear message.
   */
  handleRequest<TUser>(err: Error | null, user: TUser | false, info: Error | null): TUser {
    if (err || !user) {
      const message = info?.message || 'Authentication required';
      throw new UnauthorizedException(message);
    }
    return user;
  }
}
