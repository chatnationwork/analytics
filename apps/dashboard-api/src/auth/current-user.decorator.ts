/**
 * =============================================================================
 * CURRENT USER DECORATOR
 * =============================================================================
 * 
 * Custom parameter decorator to extract the authenticated user from request.
 */

import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthUser } from './auth.service';

/**
 * Extract the current user from the request.
 * 
 * Usage:
 * 
 * @Get('me')
 * @UseGuards(JwtAuthGuard)
 * getProfile(@CurrentUser() user: AuthUser) {
 *   return user;
 * }
 * 
 * @Get('my-id')
 * @UseGuards(JwtAuthGuard)
 * getMyId(@CurrentUser('id') userId: string) {
 *   return { id: userId };
 * }
 */
export const CurrentUser = createParamDecorator(
  (data: keyof AuthUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as AuthUser;

    if (!user) {
      return null;
    }

    return data ? user[data] : user;
  },
);
