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
  ForgotPasswordDto,
  ResetPasswordDto,
  VerifySessionTakeoverDto,
  SendSetupCodeDto,
  VerifySetupCodeDto,
  UpdateProfileDto,
} from "./dto";
import { JwtAuthGuard } from "./jwt-auth.guard";
import { ChangePasswordTokenGuard } from "./change-password-token.guard";
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
   * Check if signup is available (public).
   * Used by frontend to show/hide signup buttons.
   */
  @Get("signup-available")
  @HttpCode(HttpStatus.OK)
  async checkSignupAvailability(): Promise<{ available: boolean }> {
    return this.authService.isSignupAvailable();
  }

  /**
   * Request a password reset. Sends an email with a reset link if the email exists.
   * Always returns { ok: true } to avoid email enumeration.
   */
  @Post("forgot-password")
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() dto: ForgotPasswordDto): Promise<{ ok: true }> {
    return this.authService.requestPasswordReset(dto.email);
  }

  /**
   * Reset password using the token from the email link. Returns login response on success.
   */
  @Post("reset-password")
  @HttpCode(HttpStatus.OK)
  async resetPassword(
    @Body() dto: ResetPasswordDto,
  ): Promise<LoginResponseDto> {
    return this.authService.resetPassword(dto.token, dto.newPassword);
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
   * Update current user profile.
   */
  @Patch("me")
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async updateProfile(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateProfileDto,
  ): Promise<AuthUser> {
    await this.authService.updateProfile(user.id, dto);
    return {
      ...user,
      name: dto.name ?? user.name,
    };
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
   * Verify session takeover (2FA code or email token) and complete login. Replaces previous session.
   */
  @Post("verify-session-takeover")
  @HttpCode(HttpStatus.OK)
  async verifySessionTakeover(
    @Body() dto: VerifySessionTakeoverDto,
    @Req()
    req: {
      headers?: Record<string, string | string[] | undefined>;
      socket?: { remoteAddress?: string };
      ip?: string;
    },
  ): Promise<LoginResponseDto> {
    const requestContext = getRequestContext(req);
    const response = await this.authService.verifySessionTakeover(dto);
    if (response.user) {
      await this.auditService.log({
        tenantId: response.user.tenantId,
        actorId: response.user.id,
        actorType: "user",
        action: AuditActions.AUTH_LOGIN,
        resourceType: "user",
        resourceId: response.user.id,
        details: { email: response.user.email, viaSessionTakeover: true },
        requestContext,
      });
    }
    return response;
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
   * ChangePasswordTokenGuard copies body.changePasswordToken into Authorization when header is missing (e.g. server-side or proxied requests).
   */
  @Post("change-password")
  @UseGuards(ChangePasswordTokenGuard, JwtAuthGuard)
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

  /**
   * Send a verification code to a phone number during 2FA setup (post-signup).
   * Creates a pending verification and sends a 6-digit OTP via WhatsApp.
   */
  @Post("2fa/send-setup-code")
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async sendSetupCode(
    @CurrentUser() user: AuthUser,
    @Body() dto: SendSetupCodeDto,
  ): Promise<{ token: string }> {
    return this.authService.sendSetupCode(user.id, dto);
  }

  /**
   * Verify the OTP sent during 2FA setup and enable 2FA with the verified phone.
   * Completes the mandatory post-signup 2FA setup flow.
   */
  @Post("2fa/verify-setup")
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async verifySetupCode(
    @CurrentUser() user: AuthUser,
    @Body() dto: VerifySetupCodeDto,
  ): Promise<{ twoFactorEnabled: boolean; phone: string | null }> {
    return this.authService.verifySetupCode(user.id, dto);
  }
}
