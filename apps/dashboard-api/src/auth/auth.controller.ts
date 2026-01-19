/**
 * =============================================================================
 * AUTH CONTROLLER
 * =============================================================================
 * 
 * Authentication HTTP endpoints:
 * - POST /auth/signup - Register new user
 * - POST /auth/login - Login and get JWT
 * - GET /auth/me - Get current user (protected)
 */

import { Controller, Post, Get, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService, AuthUser } from './auth.service';
import { SignupDto, LoginDto, LoginResponseDto } from './dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { CurrentUser } from './current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Register a new user and organization.
   * Returns JWT for immediate login.
   */
  @Post('signup')
  async signup(@Body() dto: SignupDto): Promise<LoginResponseDto> {
    return this.authService.signup(dto);
  }

  /**
   * Login with email and password.
   * Returns JWT for authenticated requests.
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto): Promise<LoginResponseDto> {
    return this.authService.login(dto);
  }

  /**
   * Get current authenticated user.
   * Requires valid JWT in Authorization header.
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  getMe(@CurrentUser() user: AuthUser): AuthUser {
    return user;
  }

  /**
   * Verify token validity.
   * Returns 200 if valid, 401 if not.
   */
  @Get('verify')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  verify(): { valid: true } {
    return { valid: true };
  }
}
