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

import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { AuthService, AuthUser } from "./auth.service";
import { SignupDto, LoginDto, LoginResponseDto } from "./dto";
import { JwtAuthGuard } from "./jwt-auth.guard";
import { CurrentUser } from "./current-user.decorator";
import { AuditService, AuditActions } from "../audit/audit.service";
import { getRequestContext } from "../request-context";

@Controller("auth")
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Register a new user and organization.
   * Returns JWT for immediate login.
   */
  @Post("signup")
  async signup(@Body() dto: SignupDto): Promise<LoginResponseDto> {
    return this.authService.signup(dto);
  }

  /**
   * Login with email and password.
   * Returns JWT for authenticated requests.
   */
  @Post("login")
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Req()
    req: {
      headers?: Record<string, string | string[] | undefined>;
      socket?: { remoteAddress?: string };
      ip?: string;
    },
  ): Promise<LoginResponseDto> {
    const requestContext = getRequestContext(req);
    try {
      const response = await this.authService.login(dto);
      await this.auditService.log({
        tenantId: response.user.tenantId,
        actorId: response.user.id,
        actorType: "user",
        action: AuditActions.AUTH_LOGIN,
        resourceType: "user",
        resourceId: response.user.id,
        details: { email: response.user.email },
        requestContext,
      });
      return response;
    } catch (err) {
      await this.auditService.log({
        tenantId: "unknown",
        actorId: null,
        actorType: "user",
        action: AuditActions.AUTH_LOGIN_FAILURE,
        resourceType: "user",
        resourceId: null,
        details: { email: dto.email },
        requestContext,
      });
      throw err;
    }
  }

  /**
   * Get current authenticated user.
   * Requires valid JWT in Authorization header.
   */
  @Get("me")
  @UseGuards(JwtAuthGuard)
  getMe(@CurrentUser() user: AuthUser): AuthUser {
    return user;
  }

  /**
   * Verify token validity.
   * Returns 200 if valid, 401 if not.
   */
  @Get("verify")
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  verify(): { valid: true } {
    return { valid: true };
  }
}
