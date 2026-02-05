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
  Patch,
  Body,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
  ForbiddenException,
} from "@nestjs/common";
import { AuthService, AuthUser } from "./auth.service";
import {
  SignupDto,
  LoginDto,
  LoginResponseDto,
  ChangePasswordDto,
  Verify2FaDto,
  Update2FaDto,
  Resend2FaDto,
} from "./dto";
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
      if (response.user) {
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
      }
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
   * Logout: set presence to offline so the user stops receiving assignments.
   * Client should discard the JWT after calling this.
   */
  @Post("logout")
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logout(@CurrentUser() user: AuthUser): Promise<{ ok: true }> {
    await this.authService.logout(user.tenantId, user.id);
    return { ok: true };
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

  /**
   * Resend 2FA code for the same login attempt. Invalidates the previous code.
   */
  @Post("2fa/resend")
  @HttpCode(HttpStatus.OK)
  async resend2Fa(@Body() dto: Resend2FaDto): Promise<{ success: boolean }> {
    return this.authService.resendTwoFactorCode(dto);
  }

  /**
   * Verify 2FA code and complete login. Returns JWT on success.
   */
  @Post("2fa/verify")
  @HttpCode(HttpStatus.OK)
  async verify2Fa(
    @Body() dto: Verify2FaDto,
    @Req()
    req: {
      headers?: Record<string, string | string[] | undefined>;
      socket?: { remoteAddress?: string };
      ip?: string;
    },
  ): Promise<LoginResponseDto> {
    const requestContext = getRequestContext(req);
    const response = await this.authService.verifyTwoFactor(dto);
    if (response.user) {
      await this.auditService.log({
        tenantId: response.user.tenantId,
        actorId: response.user.id,
        actorType: "user",
        action: AuditActions.AUTH_LOGIN,
        resourceType: "user",
        resourceId: response.user.id,
        details: { email: response.user.email, via2Fa: true },
        requestContext,
      });
    }
    return response;
  }

  /**
   * Change password. Use when password has expired (changePasswordToken) or from settings.
   * Returns full login response with new JWT.
   */
  @Post("change-password")
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @CurrentUser() user: AuthUser,
    @Body() dto: ChangePasswordDto,
  ): Promise<LoginResponseDto> {
    return this.authService.changePassword(
      user.id,
      dto.currentPassword,
      dto.newPassword,
    );
  }

  /**
   * Get current user's 2FA status (masked phone).
   */
  @Get("2fa/status")
  @UseGuards(JwtAuthGuard)
  async get2FaStatus(@CurrentUser() user: AuthUser): Promise<{
    twoFactorEnabled: boolean;
    phone: string | null;
  }> {
    return this.authService.getTwoFactorStatus(user.id);
  }

  /**
   * Enable or disable 2FA and set phone. Phone required when enabling.
   * Only users with permission settings.two_factor may disable 2FA (turn it off).
   */
  @Patch("2fa")
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async update2Fa(
    @CurrentUser() user: AuthUser,
    @Body() dto: Update2FaDto,
  ): Promise<{ twoFactorEnabled: boolean; phone: string | null }> {
    if (dto.twoFactorEnabled === false) {
      const canDisable =
        user.permissions?.global?.includes("settings.two_factor") === true;
      if (!canDisable) {
        throw new ForbiddenException(
          "You do not have permission to disable two-factor authentication.",
        );
      }
    }
    return this.authService.updateTwoFactor(user.id, dto);
  }
}
