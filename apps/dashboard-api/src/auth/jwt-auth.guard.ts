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
   * Return 401 Unauthorized with a clear message (e.g. "jwt expired" when token TTL has passed).
   */
  handleRequest<TUser>(err: Error | null, user: TUser | false, info: unknown): TUser {
    if (err || !user) {
      const raw =
        (info && typeof info === "object" && "message" in info && typeof (info as { message: unknown }).message === "string"
          ? (info as { message: string }).message
          : null) ?? err?.message;
      const message =
        typeof raw === "string" && raw.length > 0
          ? raw
          : "Authentication required";
      throw new UnauthorizedException(message);
    }
    return user;
  }
}
