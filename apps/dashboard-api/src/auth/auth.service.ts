/**
 * =============================================================================
 * AUTH SERVICE
 * =============================================================================
 *
 * Handles authentication business logic:
 * - User registration (signup)
 * - User login with JWT generation
 * - Password hashing with bcrypt
 */

import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  Logger,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { randomUUID, randomBytes, createHash } from "crypto";
import { validate as uuidValidate } from "uuid";
import {
  UserRepository,
  TenantRepository,
  UserSessionRepository,
  TeamMemberEntity,
  validatePassword,
  getDefaultPasswordComplexity,
} from "@lib/database";
import { TwoFaVerificationEntity } from "@lib/database/entities/two-fa-verification.entity";
import { PasswordResetTokenEntity } from "@lib/database/entities/password-reset-token.entity";
import {
  SessionTakeoverRequestEntity,
  SessionTakeoverMethod,
} from "@lib/database/entities/session-takeover-request.entity";
import { RbacService } from "../agent-system/rbac.service";
import { EmailService } from "../email/email.service";
import { PresenceService } from "../agent-system/presence.service";
import { WhatsappService } from "../whatsapp/whatsapp.service";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import {
  SignupDto,
  LoginDto,
  LoginResponseDto,
  Verify2FaDto,
  Update2FaDto,
  Resend2FaDto,
  VerifySessionTakeoverDto,
} from "./dto";

/** JWT payload structure */
export interface JwtPayload {
  sub: string; // User ID
  email: string;
  /** Session id for single-login enforcement; validated on each request when present. */
  sessionId?: string;
  iat?: number; // Issued at
  exp?: number; // Expiry
}

/** Authenticated user info attached to request */
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  tenantId: string;
  permissions: {
    global: string[];
    team: Record<string, string[]>;
  };
  /** When true, org requires 2FA but user has not set it; client must redirect to 2FA setup. */
  twoFactorSetupRequired?: boolean;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly SALT_ROUNDS = 12;

  private readonly TWO_FA_CODE_TTL_MINUTES = 10;

  private readonly PASSWORD_RESET_TOKEN_TTL_HOURS = 24;

  private readonly SESSION_TAKEOVER_EMAIL_TTL_MINUTES = 15;

  constructor(
    private readonly userRepository: UserRepository,
    private readonly tenantRepository: TenantRepository,
    private readonly userSessionRepository: UserSessionRepository,
    @InjectRepository(TeamMemberEntity)
    private readonly teamMemberRepo: Repository<TeamMemberEntity>,
    @InjectRepository(TwoFaVerificationEntity)
    private readonly twoFaRepo: Repository<TwoFaVerificationEntity>,
    @InjectRepository(PasswordResetTokenEntity)
    private readonly passwordResetTokenRepo: Repository<PasswordResetTokenEntity>,
    @InjectRepository(SessionTakeoverRequestEntity)
    private readonly sessionTakeoverRepo: Repository<SessionTakeoverRequestEntity>,
    private readonly configService: ConfigService,
    private readonly rbacService: RbacService,
    private readonly jwtService: JwtService,
    private readonly presenceService: PresenceService,
    private readonly whatsappService: WhatsappService,
    private readonly emailService: EmailService,
  ) {}

  /**
   * Register a new user with their organization.
   * Creates both the user and a default tenant.
   */
  async signup(dto: SignupDto): Promise<LoginResponseDto> {
    // Check if email already exists
    const existingUser = await this.userRepository.emailExists(dto.email);
    if (existingUser) {
      throw new ConflictException("An account with this email already exists");
    }

    // Generate slug from organization name if not provided
    const slug =
      dto.organizationSlug ?? this.generateSlug(dto.organizationName);

    // Check if slug is available
    const slugExists = await this.tenantRepository.slugExists(slug);
    if (slugExists) {
      throw new ConflictException("This organization slug is already taken");
    }

    // Enforce password complexity (min length + uppercase, lowercase, number, special)
    const signupPasswordConfig = {
      ...getDefaultPasswordComplexity(),
      requireUppercase: true,
      requireLowercase: true,
      requireNumber: true,
      requireSpecial: true,
    };
    const pwdResult = validatePassword(dto.password, signupPasswordConfig);
    if (!pwdResult.valid) {
      throw new BadRequestException(
        pwdResult.message ?? "Password does not meet requirements",
      );
    }

    // Hash password
    const passwordHash = await bcrypt.hash(dto.password, this.SALT_ROUNDS);

    // Create user (passwordChangedAt for expiry tracking)
    const user = await this.userRepository.create({
      email: dto.email,
      passwordHash,
      name: dto.name,
      passwordChangedAt: new Date(),
    });

    // Create tenant with user as owner
    await this.tenantRepository.createWithOwner(
      {
        name: dto.organizationName,
        slug,
      },
      user.id,
    );

    this.logger.log(`New user registered: ${user.email}`);

    // Return login response
    return await this.generateLoginResponse(user);
  }

  /**
   * Authenticate user and return JWT, or require 2FA code when enabled.
   */
  async login(dto: LoginDto): Promise<LoginResponseDto> {
    const user = await this.userRepository.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException("Invalid email or password");
    }

    const isPasswordValid = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException("Invalid email or password");
    }

    const tenants = await this.tenantRepository.findByUserId(user.id);
    const activeTenant = tenants[0];
    const singleLoginEnforced =
      activeTenant?.settings?.session?.singleLoginEnforced === true;
    const existingSessionId = singleLoginEnforced
      ? await this.userSessionRepository.getCurrentSessionId(user.id)
      : null;

    if (user.twoFactorEnabled) {
      if (!user.phone || user.phone.trim() === "") {
        throw new BadRequestException(
          "2FA is enabled but no phone number is set. Contact support.",
        );
      }
      const tenantId = tenants[0]?.id;
      if (!tenantId) {
        throw new BadRequestException("User has no organization.");
      }

      if (existingSessionId) {
        const code = this.generateSixDigitCode();
        const expiresAt = new Date();
        expiresAt.setMinutes(
          expiresAt.getMinutes() + this.TWO_FA_CODE_TTL_MINUTES,
        );
        const request = await this.sessionTakeoverRepo.save({
          userId: user.id,
          method: "2fa" as SessionTakeoverMethod,
          code,
          emailTokenHash: null,
          expiresAt,
        });

        const sendResult = await this.whatsappService.sendTwoFactorCode(
          tenantId,
          user.phone,
          code,
        );
        if (!sendResult.success) {
          this.logger.warn(
            `Failed to send session takeover code to ${user.email}: ${sendResult.error}`,
          );
          throw new BadRequestException(
            sendResult.error ??
              "Could not send code to WhatsApp. Check CRM setup.",
          );
        }
        this.logger.log(
          `Session verification (2FA) required for ${user.email}; code sent`,
        );
        return {
          requiresSessionVerification: true,
          sessionVerificationMethod: "2fa",
          sessionVerificationRequestId: request.id,
        };
      }

      const code = this.generateSixDigitCode();
      const token = randomUUID();
      const expiresAt = new Date();
      expiresAt.setMinutes(
        expiresAt.getMinutes() + this.TWO_FA_CODE_TTL_MINUTES,
      );

      await this.twoFaRepo.save({
        token,
        userId: user.id,
        code,
        expiresAt,
      });

      const sendResult = await this.whatsappService.sendTwoFactorCode(
        tenantId,
        user.phone,
        code,
      );
      if (!sendResult.success) {
        this.logger.warn(
          `Failed to send 2FA code to ${user.email}: ${sendResult.error}`,
        );
        throw new BadRequestException(
          sendResult.error ??
            "Could not send code to WhatsApp. Check CRM setup.",
        );
      }

      this.logger.log(`2FA code sent to ${user.email}`);
      return {
        requiresTwoFactor: true,
        twoFactorToken: token,
      };
    }

    if (existingSessionId) {
      const token = randomBytes(32).toString("hex");
      const emailTokenHash = this.hashResetToken(token);
      const expiresAt = new Date();
      expiresAt.setMinutes(
        expiresAt.getMinutes() + this.SESSION_TAKEOVER_EMAIL_TTL_MINUTES,
      );
      const request = await this.sessionTakeoverRepo.save({
        userId: user.id,
        method: "email" as SessionTakeoverMethod,
        code: null,
        emailTokenHash,
        expiresAt,
      });

      const frontendUrl =
        this.configService.get<string>("FRONTEND_URL") ||
        "http://localhost:3000";
      const verifyUrl = `${frontendUrl}/verify-login?token=${encodeURIComponent(token)}&requestId=${encodeURIComponent(request.id)}`;

      await this.emailService.sendSessionTakeoverEmail(user.email, verifyUrl);
      this.logger.log(
        `Session verification (email) required for ${user.email}; email sent`,
      );
      return {
        requiresSessionVerification: true,
        sessionVerificationMethod: "email",
        sessionVerificationRequestId: request.id,
      };
    }

    // If tenant has password expiry, force change when stale
    const expiryDays =
      activeTenant?.settings?.passwordExpiryDays != null
        ? Number(activeTenant.settings.passwordExpiryDays)
        : null;
    const changedAt = user.passwordChangedAt ?? null;
    if (expiryDays != null && expiryDays > 0) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - expiryDays);
      if (changedAt == null || changedAt < cutoff) {
        const changePasswordToken = this.jwtService.sign(
          { sub: user.id, email: user.email, mustChangePassword: true },
          { expiresIn: "5m" },
        );
        this.logger.log(`Password expired for ${user.email}; requiring change`);
        return {
          requiresPasswordChange: true,
          changePasswordToken,
        };
      }
    }

    await this.userRepository.updateLastLogin(user.id);
    if (activeTenant) {
      await this.presenceService
        .goOnline(activeTenant.id, user.id)
        .catch((err) =>
          this.logger.warn(`Failed to set presence online: ${err?.message}`),
        );
    }

    this.logger.log(`User logged in: ${user.email}`);
    return await this.generateLoginResponse(user);
  }

  /**
   * Verify 2FA code and return full login response.
   */
  async verifyTwoFactor(dto: Verify2FaDto): Promise<LoginResponseDto> {
    const row = await this.twoFaRepo.findOne({
      where: { token: dto.twoFactorToken },
      relations: ["user"],
    });
    if (!row) {
      throw new UnauthorizedException(
        "Invalid or expired code. Please log in again.",
      );
    }
    if (new Date() > row.expiresAt) {
      await this.twoFaRepo.delete({ id: row.id });
      throw new UnauthorizedException("Code expired. Please log in again.");
    }
    if (row.code !== dto.code) {
      throw new UnauthorizedException("Invalid code.");
    }

    await this.twoFaRepo.delete({ id: row.id });

    const user = row.user;
    if (!user) {
      throw new UnauthorizedException("User not found.");
    }

    await this.userRepository.updateLastLogin(user.id);
    const tenants = await this.tenantRepository.findByUserId(user.id);
    if (tenants.length > 0) {
      await this.presenceService
        .goOnline(tenants[0].id, user.id)
        .catch((err) =>
          this.logger.warn(`Failed to set presence online: ${err?.message}`),
        );
    }

    this.logger.log(`User logged in (2FA): ${user.email}`);
    return await this.generateLoginResponse(user);
  }

  /**
   * Resend 2FA code for the same login attempt. Invalidates the previous code.
   */
  async resendTwoFactorCode(dto: Resend2FaDto): Promise<{ success: boolean }> {
    const row = await this.twoFaRepo.findOne({
      where: { token: dto.twoFactorToken },
      relations: ["user"],
    });
    if (!row) {
      throw new UnauthorizedException(
        "Invalid or expired. Please log in again.",
      );
    }
    if (new Date() > row.expiresAt) {
      await this.twoFaRepo.delete({ id: row.id });
      throw new UnauthorizedException("Code expired. Please log in again.");
    }

    const newCode = this.generateSixDigitCode();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + this.TWO_FA_CODE_TTL_MINUTES);

    await this.twoFaRepo.update(row.id, { code: newCode, expiresAt });

    const user = row.user;
    if (!user?.phone) {
      throw new BadRequestException("User phone not set.");
    }
    const tenants = await this.tenantRepository.findByUserId(user.id);
    const tenantId = tenants[0]?.id;
    if (!tenantId) {
      throw new BadRequestException("User has no organisation.");
    }

    const sendResult = await this.whatsappService.sendTwoFactorCode(
      tenantId,
      user.phone,
      newCode,
    );
    if (!sendResult.success) {
      this.logger.warn(
        `Failed to resend 2FA code to ${user.email}: ${sendResult.error}`,
      );
      throw new BadRequestException(
        sendResult.error ?? "Could not send code to WhatsApp.",
      );
    }

    this.logger.log(`2FA code resent to ${user.email}`);
    return { success: true };
  }

  /**
   * Get 2FA status for current user (masked phone).
   */
  async getTwoFactorStatus(userId: string): Promise<{
    twoFactorEnabled: boolean;
    phone: string | null;
  }> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      return { twoFactorEnabled: false, phone: null };
    }
    const phone = user.phone ? this.maskPhone(user.phone) : null;
    return {
      twoFactorEnabled: !!user.twoFactorEnabled,
      phone,
    };
  }

  /**
   * Enable or disable 2FA and set phone. Phone required when enabling.
   */
  async updateTwoFactor(
    userId: string,
    dto: Update2FaDto,
  ): Promise<{ twoFactorEnabled: boolean; phone: string | null }> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new UnauthorizedException("User not found");
    }

    const tenants = await this.tenantRepository.findByUserId(userId);
    const activeTenant = tenants[0];
    const twoFactorRequired =
      activeTenant?.settings && "twoFactorRequired" in activeTenant.settings
        ? !!activeTenant.settings.twoFactorRequired
        : false;

    const twoFactorEnabled = dto.twoFactorEnabled ?? user.twoFactorEnabled;
    let phone =
      dto.phone !== undefined ? this.normalizePhone(dto.phone) : user.phone;

    if (twoFactorRequired && !twoFactorEnabled) {
      throw new BadRequestException(
        "Your organization requires two-factor authentication. You cannot disable 2FA.",
      );
    }

    if (twoFactorEnabled && (!phone || phone.length < 10)) {
      throw new BadRequestException(
        "A phone number (10–15 digits) is required to enable two-factor authentication.",
      );
    }

    if (!twoFactorEnabled) {
      phone = null;
    }

    await this.userRepository.update(userId, {
      twoFactorEnabled,
      phone,
    });

    return {
      twoFactorEnabled,
      phone: phone ? this.maskPhone(phone) : null,
    };
  }

  private generateSixDigitCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private maskPhone(phone: string): string {
    const digits = phone.replace(/\D/g, "");
    if (digits.length <= 4) return "****";
    return "*".repeat(digits.length - 4) + digits.slice(-4);
  }

  private normalizePhone(phone: string): string {
    return phone.replace(/\D/g, "").trim();
  }

  private hashResetToken(token: string): string {
    return createHash("sha256").update(token, "utf8").digest("hex");
  }

  /**
   * Request a password reset. Sends an email with a link if the user exists.
   * Always returns success to avoid email enumeration.
   */
  async requestPasswordReset(email: string): Promise<{ ok: true }> {
    const user = await this.userRepository.findByEmail(
      email.trim().toLowerCase(),
    );
    if (!user) {
      this.logger.log(`Password reset requested for unknown email: ${email}`);
      return { ok: true };
    }

    await this.passwordResetTokenRepo.delete({ userId: user.id });

    const token = randomBytes(32).toString("hex");
    const tokenHash = this.hashResetToken(token);
    const expiresAt = new Date();
    expiresAt.setHours(
      expiresAt.getHours() + this.PASSWORD_RESET_TOKEN_TTL_HOURS,
    );

    await this.passwordResetTokenRepo.save({
      userId: user.id,
      tokenHash,
      expiresAt,
    });

    const frontendUrl =
      this.configService.get<string>("FRONTEND_URL") || "http://localhost:3000";
    const resetUrl = `${frontendUrl}/reset-password?token=${encodeURIComponent(token)}`;

    await this.emailService.sendPasswordResetEmail(user.email, resetUrl);
    this.logger.log(`Password reset email sent to ${user.email}`);
    return { ok: true };
  }

  /**
   * Reset password using the token from the email link.
   */
  async resetPassword(
    token: string,
    newPassword: string,
  ): Promise<LoginResponseDto> {
    const tokenHash = this.hashResetToken(token.trim());
    const row = await this.passwordResetTokenRepo.findOne({
      where: { tokenHash },
      relations: ["user"],
    });

    if (!row || !row.user) {
      throw new BadRequestException("Invalid or expired reset link");
    }
    if (new Date() > row.expiresAt) {
      await this.passwordResetTokenRepo.delete({ id: row.id });
      throw new BadRequestException("Reset link has expired");
    }

    const user = row.user;
    const tenants = await this.tenantRepository.findByUserId(user.id);
    const tenant = tenants[0];
    const config = tenant?.settings?.passwordComplexity ?? null;
    const result = validatePassword(newPassword, config);
    if (!result.valid) {
      throw new BadRequestException(
        result.message ?? "New password does not meet requirements",
      );
    }

    const passwordHash = await bcrypt.hash(newPassword, this.SALT_ROUNDS);
    await this.userRepository.update(user.id, {
      passwordHash,
      passwordChangedAt: new Date(),
    });
    await this.passwordResetTokenRepo.delete({ userId: user.id });

    const updated = await this.userRepository.findById(user.id);
    if (!updated) throw new UnauthorizedException("User not found");
    return this.generateLoginResponse(updated);
  }

  /**
   * Change password (e.g. when expired or from settings).
   * Validates current password and new password against tenant complexity; updates user and returns new login response.
   */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<LoginResponseDto> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new UnauthorizedException("User not found");
    }
    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException("Current password is incorrect");
    }
    const tenants = await this.tenantRepository.findByUserId(userId);
    const tenant = tenants[0];
    const config = tenant?.settings?.passwordComplexity ?? null;
    const result = validatePassword(newPassword, config);
    if (!result.valid) {
      throw new BadRequestException(
        result.message ?? "New password does not meet requirements",
      );
    }
    const passwordHash = await bcrypt.hash(newPassword, this.SALT_ROUNDS);
    await this.userRepository.update(userId, {
      passwordHash,
      passwordChangedAt: new Date(),
    });
    const updated = await this.userRepository.findById(userId);
    if (!updated) throw new UnauthorizedException("User not found");
    return this.generateLoginResponse(updated);
  }

  /**
   * Logout: clear single-login session and set agent presence to offline.
   */
  async logout(tenantId: string, userId: string): Promise<void> {
    await this.userSessionRepository.clearSession(userId);
    await this.presenceService
      .goOffline(tenantId, userId)
      .catch((err) =>
        this.logger.warn(`Failed to set presence offline: ${err?.message}`),
      );
  }

  /**
   * Verify session takeover (2FA code or email token) and issue new JWT, replacing previous session.
   */
  async verifySessionTakeover(
    dto: VerifySessionTakeoverDto,
  ): Promise<LoginResponseDto> {
    if (dto.requestId && dto.code) {
      const row = await this.sessionTakeoverRepo.findOne({
        where: { id: dto.requestId },
        relations: ["user"],
      });
      if (!row || row.method !== "2fa") {
        throw new UnauthorizedException(
          "Invalid or expired verification. Please log in again.",
        );
      }
      if (new Date() > row.expiresAt) {
        await this.sessionTakeoverRepo.delete({ id: row.id });
        throw new UnauthorizedException(
          "Verification expired. Please log in again.",
        );
      }
      if (row.code !== dto.code) {
        throw new UnauthorizedException("Invalid code.");
      }
      const user = row.user;
      if (!user) {
        throw new UnauthorizedException("User not found.");
      }
      await this.sessionTakeoverRepo.delete({ id: row.id });
      await this.userRepository.updateLastLogin(user.id);
      const tenants = await this.tenantRepository.findByUserId(user.id);
      if (tenants.length > 0) {
        await this.presenceService
          .goOnline(tenants[0].id, user.id)
          .catch((err) =>
            this.logger.warn(`Failed to set presence online: ${err?.message}`),
          );
      }
      this.logger.log(`Session takeover verified (2FA): ${user.email}`);
      return await this.generateLoginResponse(user);
    }

    if (dto.token) {
      const rawToken = dto.token.trim();
      const tokenHash = this.hashResetToken(rawToken);
      this.logger.log(
        `Session takeover (email): token length=${rawToken.length}, attempting lookup`,
      );

      let row = await this.sessionTakeoverRepo.findOne({
        where: { emailTokenHash: tokenHash },
        relations: ["user"],
      });

      if ((!row || row.method !== "email") && dto.requestId) {
        this.logger.log(
          `Session takeover (email): no row by hash, trying requestId=${dto.requestId}`,
        );
        row = await this.sessionTakeoverRepo.findOne({
          where: { id: dto.requestId },
          relations: ["user"],
        });
        if (row && row.method === "email" && row.emailTokenHash !== tokenHash) {
          this.logger.warn(
            `Session takeover (email): requestId row found but token hash mismatch`,
          );
          row = null;
        }
      }

      if (!row || row.method !== "email") {
        this.logger.warn(
          `Session takeover (email): no valid row found (by hash or requestId)`,
        );
        throw new UnauthorizedException(
          "Invalid or expired link. Please log in again.",
        );
      }
      if (new Date() > row.expiresAt) {
        await this.sessionTakeoverRepo.delete({ id: row.id });
        throw new UnauthorizedException("Link expired. Please log in again.");
      }
      const user = row.user;
      if (!user) {
        throw new UnauthorizedException("User not found.");
      }
      await this.sessionTakeoverRepo.delete({ id: row.id });
      await this.userRepository.updateLastLogin(user.id);
      const tenants = await this.tenantRepository.findByUserId(user.id);
      if (tenants.length > 0) {
        await this.presenceService
          .goOnline(tenants[0].id, user.id)
          .catch((err) =>
            this.logger.warn(`Failed to set presence online: ${err?.message}`),
          );
      }
      this.logger.log(`Session takeover verified (email): ${user.email}`);
      return await this.generateLoginResponse(user);
    }

    throw new BadRequestException(
      "Provide requestId and code (2FA) or token (email link).",
    );
  }

  /**
   * Returns true when the org requires 2FA and the user has not enabled it.
   * Used by TwoFactorEnforcementInterceptor to block non-whitelisted API access.
   */
  async is2FaSetupRequired(userId: string): Promise<boolean> {
    if (!uuidValidate(userId)) return false;
    const user = await this.userRepository.findById(userId);
    if (!user) return false;
    const tenants = await this.tenantRepository.findByUserId(userId);
    const activeTenant = tenants[0];
    if (!activeTenant) return false;
    const twoFactorRequired =
      (activeTenant.settings as { twoFactorRequired?: boolean } | undefined)
        ?.twoFactorRequired === true;
    return twoFactorRequired && !user.twoFactorEnabled;
  }

  /**
   * Return true if the given sessionId is still the current session for the user (single-login check).
   * If payload has no sessionId (legacy token), returns true to allow backward compatibility.
   */
  async isSessionValid(
    userId: string,
    sessionId: string | undefined,
  ): Promise<boolean> {
    if (!sessionId) return true;
    const current =
      await this.userSessionRepository.getCurrentSessionId(userId);
    return current === sessionId;
  }

  /**
   * Get user by ID (for JWT validation).
   */
  async validateUser(userId: string): Promise<AuthUser | null> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      return null;
    }

    const tenants = await this.tenantRepository.findByUserId(userId);
    const activeTenant = tenants[0]; // For now, simple multi-tenancy (first tenant)

    if (!activeTenant) {
      // Should rarely happen as signup creates tenant
      this.logger.warn(`User ${userId} has no tenants`);
      return null;
    }

    const permissions = await this.getUserPermissions(user.id);
    const twoFactorRequired =
      (activeTenant.settings as { twoFactorRequired?: boolean } | undefined)
        ?.twoFactorRequired === true;
    const twoFactorSetupRequired = twoFactorRequired && !user.twoFactorEnabled;

    return {
      id: user.id,
      email: user.email,
      name: user.name ?? "",
      tenantId: activeTenant.id,
      permissions,
      twoFactorSetupRequired: twoFactorSetupRequired || undefined,
    };
  }

  /**
   * Generate JWT and login response.
   */
  /**
   * Generate JWT and login response.
   */
  private async generateLoginResponse(user: {
    id: string;
    email: string;
    name?: string | null;
  }): Promise<LoginResponseDto> {
    // Determine expiration based on tenant settings
    const tenants = await this.tenantRepository.findByUserId(user.id);
    const activeTenant = tenants[0];

    // Default: 7 days in minutes
    let maxDurationMinutes = 10080;

    if (
      activeTenant &&
      activeTenant.settings &&
      activeTenant.settings.session
    ) {
      maxDurationMinutes =
        activeTenant.settings.session.maxDurationMinutes || 10080;
    }

    const sessionId = randomUUID();
    await this.userSessionRepository.setCurrentSessionId(user.id, sessionId);

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      sessionId,
    };

    // Sign with dynamic expiration
    const accessToken = this.jwtService.sign(payload, {
      expiresIn: `${maxDurationMinutes}m`,
    });

    // Calculate seconds for response
    const expiresIn = maxDurationMinutes * 60;

    const permissions = await this.getUserPermissions(user.id);

    const tenantId = activeTenant?.id ?? "";
    const fullUser = await this.userRepository.findById(user.id);
    const twoFactorRequired =
      activeTenant?.settings && "twoFactorRequired" in activeTenant.settings
        ? !!activeTenant.settings.twoFactorRequired
        : false;
    const twoFactorSetupRequired =
      twoFactorRequired && !(fullUser?.twoFactorEnabled === true);

    return {
      accessToken,
      tokenType: "Bearer",
      expiresIn,
      user: {
        id: user.id,
        email: user.email,
        name: user.name ?? "",
        tenantId,
        permissions,
        twoFactorSetupRequired,
      },
    };
  }

  /**
   * Fetch permissions for a user.
   */
  async getUserPermissions(
    userId: string,
  ): Promise<{ global: string[]; team: Record<string, string[]> }> {
    // 1. Get Global Permissions
    const tenants = await this.tenantRepository.findByUserId(userId);
    const activeTenant = tenants[0];
    let globalPermissions: string[] = [];

    if (activeTenant) {
      const globalRole = await this.tenantRepository.getUserRole(
        userId,
        activeTenant.id,
      );
      if (globalRole) {
        globalPermissions =
          await this.rbacService.getPermissionsForRole(globalRole);
      }
    }

    // 2. Get Team Permissions
    const teamMemberships = await this.teamMemberRepo.find({
      where: { userId },
    });
    const teamPermissions: Record<string, string[]> = {};

    for (const membership of teamMemberships) {
      const perms = await this.rbacService.getPermissionsForRole(
        membership.role,
      );
      teamPermissions[membership.teamId] = perms;
    }

    return { global: globalPermissions, team: teamPermissions };
  }

  /**
   * Generate URL-friendly slug from organization name.
   */
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .substring(0, 50);
  }
}
